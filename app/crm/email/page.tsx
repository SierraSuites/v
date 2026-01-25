'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  is_active: boolean
  usage_count: number
  created_at: string
}

interface Contact {
  id: string
  full_name: string
  email: string | null
  company: string | null
}

export default function EmailCenterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [emailForm, setEmailForm] = useState({
    recipients: [] as string[],
    subject: '',
    body: '',
    template_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('crm_email_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (templatesError) throw templatesError
      setTemplates(templatesData || [])

      // Load contacts with emails
      const { data: contactsData, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('id, full_name, email, company')
        .eq('user_id', user.id)
        .not('email', 'is', null)
        .order('full_name', { ascending: true })

      if (contactsError) throw contactsError
      setContacts(contactsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const useTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEmailForm(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body,
      template_id: template.id
    }))
    setShowComposeModal(true)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this email template?')) return

    try {
      const { error } = await supabase
        .from('crm_email_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const handleRecipientToggle = (email: string) => {
    setEmailForm(prev => ({
      ...prev,
      recipients: prev.recipients.includes(email)
        ? prev.recipients.filter(e => e !== email)
        : [...prev.recipients, email]
    }))
  }

  const handleSendEmail = async () => {
    if (emailForm.recipients.length === 0) {
      alert('Please select at least one recipient')
      return
    }

    if (!emailForm.subject || !emailForm.body) {
      alert('Subject and body are required')
      return
    }

    // In a real app, this would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, we'll show a success message and log the activity

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Log email activity for each recipient
      const activities = emailForm.recipients.map(recipientEmail => {
        const contact = contacts.find(c => c.email === recipientEmail)
        return {
          user_id: user.id,
          activity_type: 'email',
          subject: `Email: ${emailForm.subject}`,
          description: emailForm.body,
          scheduled_date: new Date().toISOString(),
          status: 'completed',
          contact_id: contact?.id || null,
          outcome: `Email sent to ${recipientEmail}`,
          completed_date: new Date().toISOString()
        }
      })

      const { error } = await supabase
        .from('crm_activities')
        .insert(activities)

      if (error) throw error

      // Update template usage count
      if (emailForm.template_id) {
        const template = templates.find(t => t.id === emailForm.template_id)
        if (template) {
          await supabase
            .from('crm_email_templates')
            .update({ usage_count: template.usage_count + emailForm.recipients.length })
            .eq('id', emailForm.template_id)
        }
      }

      alert(`Email sent to ${emailForm.recipients.length} recipient(s)!\n\nNote: In production, this would integrate with your email service (Gmail, Outlook, SendGrid, etc.)`)

      setShowComposeModal(false)
      setEmailForm({ recipients: [], subject: '', body: '', template_id: '' })
      setSelectedTemplate(null)
      loadData()
    } catch (error) {
      console.error('Error logging email:', error)
      alert('Failed to log email activity')
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'follow_up': return '🔔'
      case 'proposal': return '📋'
      case 'thank_you': return '🙏'
      case 'reminder': return '⏰'
      case 'introduction': return '👋'
      case 'update': return '📰'
      default: return '📧'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'follow_up': return 'bg-blue-100 text-blue-700'
      case 'proposal': return 'bg-purple-100 text-purple-700'
      case 'thank_you': return 'bg-green-100 text-green-700'
      case 'reminder': return 'bg-orange-100 text-orange-700'
      case 'introduction': return 'bg-indigo-100 text-indigo-700'
      case 'update': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/crm"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Email Center</h1>
                  <p className="text-gray-600 mt-1">Manage templates and send emails to contacts</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Compose Email
              </button>
              <Link
                href="/crm/email/templates/new"
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Template
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Templates</div>
              <div className="text-2xl">📧</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{templates.length}</div>
            <div className="text-sm text-gray-500 mt-1">Ready to use</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Active Templates</div>
              <div className="text-2xl">✅</div>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {templates.filter(t => t.is_active).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Currently enabled</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Usage</div>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {templates.reduce((sum, t) => sum + t.usage_count, 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Emails sent</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Contacts with Email</div>
              <div className="text-2xl">👥</div>
            </div>
            <div className="text-3xl font-bold text-purple-600">{contacts.length}</div>
            <div className="text-sm text-gray-500 mt-1">Can receive emails</div>
          </div>
        </div>

        {/* Integration Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🔌</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Integration Available</h3>
              <p className="text-sm text-gray-700 mb-4">
                Connect your email account to send directly from Sierra Suites. Supports Gmail, Outlook, and custom SMTP.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  📧 Connect Gmail
                </button>
                <button className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  📇 Connect Outlook
                </button>
                <button className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  ⚙️ Custom SMTP
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Pro/Enterprise Feature:</strong> Currently using native email logging. Connect your email to send directly.
              </p>
            </div>
          </div>
        </div>

        {/* Templates */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No email templates yet</h3>
            <p className="text-gray-600 mb-6">Create reusable email templates to save time</p>
            <Link
              href="/crm/email/templates/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Template
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {category.replace('_', ' ')} Templates
                  </h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    {categoryTemplates.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTemplates.map(template => (
                    <div
                      key={template.id}
                      className="bg-white rounded-lg shadow border-2 border-gray-200 hover:border-blue-400 transition-colors"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                                {template.category}
                              </span>
                              {!template.is_active && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-1">Subject:</div>
                          <div className="text-sm text-gray-900 font-medium line-clamp-1">
                            {template.subject}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-1">Body Preview:</div>
                          <div className="text-sm text-gray-700 line-clamp-3">
                            {template.body}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <span>Used {template.usage_count} times</span>
                          <span>{new Date(template.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => useTemplate(template)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Use Template
                          </button>
                          <Link
                            href={`/crm/email/templates/${template.id}/edit`}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Compose Email</h2>
              <button
                onClick={() => {
                  setShowComposeModal(false)
                  setEmailForm({ recipients: [], subject: '', body: '', template_id: '' })
                  setSelectedTemplate(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients ({emailForm.recipients.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      No contacts with email addresses. <Link href="/crm/contacts/new" className="text-blue-600">Add contacts</Link> first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailForm.recipients.includes(contact.email!)}
                            onChange={() => handleRecipientToggle(contact.email!)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{contact.full_name}</div>
                            <div className="text-sm text-gray-600">
                              {contact.email}
                              {contact.company && ` • ${contact.company}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email subject..."
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter email body..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use variables: {'{contact_name}'}, {'{company_name}'}, {'{your_name}'}
                </p>
              </div>

              {selectedTemplate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Using template: {selectedTemplate.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowComposeModal(false)
                  setEmailForm({ recipients: [], subject: '', body: '', template_id: '' })
                  setSelectedTemplate(null)
                }}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSendEmail}
                disabled={emailForm.recipients.length === 0 || !emailForm.subject || !emailForm.body}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Email ({emailForm.recipients.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
