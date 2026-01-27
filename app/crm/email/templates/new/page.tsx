'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewEmailTemplatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'follow_up',
    is_active: true
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('body') as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.body
    const before = text.substring(0, start)
    const after = text.substring(end)

    setFormData(prev => ({
      ...prev,
      body: before + variable + after
    }))

    // Set cursor position after variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.subject || !formData.body) {
      alert('Name, subject, and body are required')
      return
    }

    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const templateData = {
        user_id: user.id,
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        category: formData.category,
        is_active: formData.is_active,
        usage_count: 0
      }

      const { error } = await supabase
        .from('crm_email_templates')
        .insert([templateData])

      if (error) throw error

      router.push('/crm/email')
    } catch (error: any) {
      console.error('Error creating template:', error)
      alert(`Failed to create template: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const presetTemplates = [
    {
      name: 'Initial Contact',
      category: 'introduction',
      subject: 'Re: Your Construction Project Inquiry',
      body: `Hi {contact_name},

Thank you for reaching out about your construction project. I'm {your_name} from {company_name}, and I'd love to discuss your needs in more detail.

Could we schedule a brief call this week to go over:
- Project scope and timeline
- Budget considerations
- Your vision and requirements

I have availability on [days/times]. What works best for you?

Looking forward to connecting!

Best regards,
{your_name}
{company_name}
{phone_number}`
    },
    {
      name: 'Quote Follow-Up',
      category: 'follow_up',
      subject: 'Following Up on Your Quote',
      body: `Hi {contact_name},

I wanted to follow up on the quote I sent last week for {project_name}.

Do you have any questions about the scope, timeline, or pricing? I'm happy to jump on a call to discuss any details.

Also, I've attached some photos from similar projects we've completed that might interest you.

Let me know if you'd like to move forward or if you need any clarification.

Best regards,
{your_name}
{company_name}`
    },
    {
      name: 'Project Proposal Sent',
      category: 'proposal',
      subject: 'Your Custom Construction Proposal',
      body: `Hi {contact_name},

Great news! I've prepared a detailed proposal for {project_name}.

The proposal includes:
✓ Complete scope of work
✓ Detailed timeline with milestones
✓ Transparent pricing breakdown
✓ Material specifications
✓ Payment schedule

Please review and let me know if you have any questions. I'm available to discuss any aspect of the proposal.

Looking forward to working with you!

Best regards,
{your_name}
{company_name}`
    },
    {
      name: 'Project Update',
      category: 'update',
      subject: 'Weekly Update: {project_name}',
      body: `Hi {contact_name},

Here's your weekly update for {project_name}:

COMPLETED THIS WEEK:
• [Task 1]
• [Task 2]
• [Task 3]

PLANNED FOR NEXT WEEK:
• [Task 1]
• [Task 2]

BUDGET STATUS:
Current: [X]% of budget used
Remaining: $[amount]

Please let me know if you have any questions or concerns.

Best regards,
{your_name}
{company_name}`
    },
    {
      name: 'Thank You After Meeting',
      category: 'thank_you',
      subject: 'Thank You for Meeting Today',
      body: `Hi {contact_name},

Thank you for taking the time to meet with me today. I enjoyed learning more about your vision for {project_name}.

As discussed, next steps are:
1. [Next step 1]
2. [Next step 2]
3. [Next step 3]

I'll send over [deliverable] by [date] as promised.

Please don't hesitate to reach out if you have any questions in the meantime.

Best regards,
{your_name}
{company_name}`
    },
    {
      name: 'Payment Reminder',
      category: 'reminder',
      subject: 'Friendly Reminder: Invoice #{invoice_number}',
      body: `Hi {contact_name},

This is a friendly reminder that Invoice #{invoice_number} for {project_name} was due on {due_date}.

Invoice Details:
Amount: {amount}
Due Date: {due_date}
Project: {project_name}

If you've already sent payment, please disregard this message. Otherwise, you can pay via:
• Check
• Bank transfer
• Credit card (link)

Let me know if you have any questions or need a payment plan.

Thank you,
{your_name}
{company_name}`
    }
  ]

  const usePreset = (preset: typeof presetTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      subject: preset.subject,
      body: preset.body,
      category: preset.category
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Link
              href="/crm/email"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Email Template</h1>
              <p className="text-sm text-gray-600">Save time with reusable email templates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Preset Templates */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start with a Preset Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presetTemplates.map((preset, index) => (
              <button
                key={index}
                onClick={() => usePreset(preset)}
                className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
              >
                <h3 className="font-semibold text-gray-900 mb-1">{preset.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{preset.subject}</p>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {preset.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Initial Contact, Quote Follow-Up"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="follow_up">Follow Up</option>
                    <option value="proposal">Proposal</option>
                    <option value="thank_you">Thank You</option>
                    <option value="reminder">Reminder</option>
                    <option value="introduction">Introduction</option>
                    <option value="update">Update</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Template is active</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Body <span className="text-red-600">*</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    {formData.body.length} characters
                  </div>
                </div>
                <textarea
                  id="body"
                  name="body"
                  value={formData.body}
                  onChange={handleChange}
                  required
                  rows={16}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter email body..."
                />
              </div>

              {/* Variable Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Variables
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '{contact_name}',
                    '{company_name}',
                    '{your_name}',
                    '{phone_number}',
                    '{project_name}',
                    '{invoice_number}',
                    '{due_date}',
                    '{amount}'
                  ].map(variable => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-mono"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click to insert variables into your template. These will be replaced with actual values when sending.
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>

            <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="mb-4 pb-4 border-b border-gray-300">
                <div className="text-xs text-gray-500 mb-1">Subject:</div>
                <div className="font-semibold text-gray-900">
                  {formData.subject || '(No subject)'}
                </div>
              </div>

              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {formData.body || '(No content)'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
            <Link
              href="/crm/email"
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
