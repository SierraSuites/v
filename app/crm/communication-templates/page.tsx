'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'

// Template Types
type TemplateCategory =
  | 'email'
  | 'meeting_agenda'
  | 'presentation'
  | 'feedback_form'
  | 'weekly_update'
  | 'project_kickoff'
  | 'milestone_notification'
  | 'change_order_request'
  | 'payment_reminder'
  | 'completion_notice'

type TemplateVariables = {
  client_name: string
  project_name: string
  project_address: string
  start_date: string
  completion_date: string
  next_milestone: string
  milestone_name: string
  budget_total: string
  amount_due: string
  company_name: string
  project_manager: string
  pm_phone: string
  pm_email: string
}

interface CommunicationTemplate {
  id: string
  user_id: string
  name: string
  category: TemplateCategory
  subject: string
  body: string
  variables: string[] // List of variable names used in template
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  tags: string[]
}

interface ScheduledCommunication {
  id: string
  template_id: string
  project_id: string
  recipients: string[]
  scheduled_date: string
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled'
  sent_at: string | null
  variables: Partial<TemplateVariables>
}

interface BulkCommunication {
  id: string
  template_id: string
  project_ids: string[]
  total_recipients: number
  sent_count: number
  failed_count: number
  status: 'draft' | 'sending' | 'completed' | 'failed'
  created_at: string
  completed_at: string | null
}

export default function CommunicationTemplatesPage() {
  const [activeView, setActiveView] = useState<'templates' | 'scheduled' | 'bulk' | 'create'>('templates')
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Template Editor
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('email')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateTags, setTemplateTags] = useState<string[]>([])

  // Preview
  const [previewMode, setPreviewMode] = useState(false)
  const [previewVariables, setPreviewVariables] = useState<Partial<TemplateVariables>>({
    client_name: 'John Smith',
    project_name: 'Kitchen Remodel',
    project_address: '123 Main St, Seattle, WA 98101',
    start_date: '2024-01-15',
    completion_date: '2024-03-30',
    next_milestone: 'Cabinet Installation',
    budget_total: '$45,000',
    amount_due: '$15,000',
    company_name: 'ABC Construction',
    project_manager: 'Sarah Johnson',
    pm_phone: '(555) 123-4567',
    pm_email: 'sarah@abcconstruction.com'
  })

  // Scheduled Communications
  const [scheduledCommunications, setScheduledCommunications] = useState<ScheduledCommunication[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleRecipients, setScheduleRecipients] = useState<string[]>([])

  // Bulk Communications
  const [bulkCommunications, setBulkCommunications] = useState<BulkCommunication[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  // Load demo templates on mount
  useEffect(() => {
    loadDemoTemplates()
    loadScheduledCommunications()
    loadBulkCommunications()
  }, [])

  const loadDemoTemplates = () => {
    const demoTemplates: CommunicationTemplate[] = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'Weekly Project Update',
        category: 'weekly_update',
        subject: 'Weekly Update: {{project_name}} - Week of {{current_date}}',
        body: `Hi {{client_name}},

Here's your weekly update for {{project_name}}:

PROGRESS THIS WEEK:
• Completed framing inspection
• Started electrical rough-in
• Installed HVAC ductwork

NEXT WEEK'S SCHEDULE:
• Complete electrical rough-in
• Plumbing inspection
• Begin insulation installation

UPCOMING MILESTONE:
{{next_milestone}} scheduled for completion by {{completion_date}}

Please let me know if you have any questions or would like to schedule a site visit.

Best regards,
{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'project_name', 'current_date', 'next_milestone', 'completion_date', 'project_manager', 'company_name', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 234,
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        tags: ['weekly', 'update', 'progress']
      },
      {
        id: '2',
        user_id: 'user-1',
        name: 'Project Kickoff Meeting Agenda',
        category: 'meeting_agenda',
        subject: 'Project Kickoff Meeting - {{project_name}}',
        body: `PROJECT KICKOFF MEETING AGENDA

Project: {{project_name}}
Location: {{project_address}}
Date: {{start_date}}
Time: 10:00 AM - 11:30 AM

ATTENDEES:
• Client: {{client_name}}
• Project Manager: {{project_manager}}
• Site Supervisor
• Lead Carpenter

AGENDA:

1. INTRODUCTIONS (10 min)
   • Team introductions
   • Roles and responsibilities

2. PROJECT OVERVIEW (20 min)
   • Review scope of work
   • Timeline and milestones
   • Budget overview

3. COMMUNICATION PROTOCOL (15 min)
   • Primary contact: {{project_manager}}
   • Phone: {{pm_phone}}
   • Email: {{pm_email}}
   • Weekly update schedule
   • Emergency contact procedures

4. SITE ACCESS & LOGISTICS (15 min)
   • Work hours: 7:00 AM - 4:00 PM, Monday-Friday
   • Parking arrangements
   • Material delivery schedule
   • Bathroom facilities

5. CLIENT EXPECTATIONS (15 min)
   • Decision timelines
   • Site visit schedule
   • Change order process
   • Payment schedule

6. NEXT STEPS (10 min)
   • First week activities
   • Permits and inspections
   • Material deliveries

7. Q&A (15 min)

Please review this agenda and let me know if you have any questions or items to add.

Looking forward to working with you!

{{project_manager}}
{{company_name}}`,
        variables: ['project_name', 'project_address', 'start_date', 'client_name', 'project_manager', 'pm_phone', 'pm_email', 'company_name'],
        is_public: true,
        usage_count: 189,
        created_at: '2024-01-08T14:00:00Z',
        updated_at: '2024-01-08T14:00:00Z',
        tags: ['kickoff', 'meeting', 'agenda']
      },
      {
        id: '3',
        user_id: 'user-1',
        name: 'Payment Reminder - Professional',
        category: 'payment_reminder',
        subject: 'Payment Due - {{project_name}} Invoice',
        body: `Dear {{client_name}},

This is a friendly reminder that payment for {{project_name}} is due.

INVOICE DETAILS:
Invoice Number: INV-{{invoice_number}}
Amount Due: {{amount_due}}
Due Date: {{due_date}}

PAYMENT OPTIONS:
• Check: Mail to {{company_address}}
• Bank Transfer: Account details provided with invoice
• Credit Card: Call {{pm_phone}} to process
• Online Portal: Pay securely at {{payment_portal_url}}

WORK COMPLETED:
• Foundation and framing complete
• Electrical and plumbing rough-in
• HVAC installation
• Insulation and drywall

We appreciate your prompt payment so we can continue with the next phase of your project.

If you have any questions about this invoice, please don't hesitate to contact me.

Thank you for your business!

{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'project_name', 'invoice_number', 'amount_due', 'due_date', 'company_address', 'pm_phone', 'payment_portal_url', 'project_manager', 'company_name', 'pm_email'],
        is_public: true,
        usage_count: 156,
        created_at: '2024-01-05T09:00:00Z',
        updated_at: '2024-01-05T09:00:00Z',
        tags: ['payment', 'reminder', 'invoice']
      },
      {
        id: '4',
        user_id: 'user-1',
        name: 'Change Order Request',
        category: 'change_order_request',
        subject: 'Change Order Request - {{project_name}}',
        body: `Hi {{client_name}},

As discussed, I'm sending the formal change order request for {{project_name}}.

PROPOSED CHANGE:
{{change_description}}

REASON FOR CHANGE:
{{change_reason}}

COST IMPACT:
Additional Cost: {{change_cost}}
Current Project Budget: {{budget_total}}
New Project Budget: {{new_budget_total}}

SCHEDULE IMPACT:
Additional Days: {{additional_days}}
Original Completion: {{completion_date}}
New Completion: {{new_completion_date}}

SCOPE OF WORK:
{{scope_details}}

NEXT STEPS:
1. Review this change order
2. Sign approval form (attached)
3. Return signed form to proceed
4. Payment required before work begins

Please review and let me know if you have any questions. I'm happy to discuss this in more detail.

Once approved, we'll incorporate this into the project schedule and provide updated timeline.

Best regards,
{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'project_name', 'change_description', 'change_reason', 'change_cost', 'budget_total', 'new_budget_total', 'additional_days', 'completion_date', 'new_completion_date', 'scope_details', 'project_manager', 'company_name', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 98,
        created_at: '2024-01-12T11:00:00Z',
        updated_at: '2024-01-12T11:00:00Z',
        tags: ['change_order', 'approval', 'scope']
      },
      {
        id: '5',
        user_id: 'user-1',
        name: 'Milestone Completion Notification',
        category: 'milestone_notification',
        subject: 'Milestone Completed: {{milestone_name}} - {{project_name}}',
        body: `Great news, {{client_name}}!

We've successfully completed the {{milestone_name}} phase of {{project_name}}.

COMPLETED WORK:
{{completed_work_list}}

QUALITY CHECKS:
✓ All work inspected and approved
✓ {{inspection_type}} inspection passed
✓ Photos documented in FieldSnap
✓ Ready for next phase

NEXT MILESTONE:
{{next_milestone}} - Scheduled to begin {{next_start_date}}

PHOTOS & DOCUMENTATION:
You can view progress photos and documentation in your project portal or I can send them directly.

UPCOMING SCHEDULE:
Week 1: {{week_1_activities}}
Week 2: {{week_2_activities}}

Would you like to schedule a walk-through to review the completed work?

Thanks for your continued trust in our team!

{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'milestone_name', 'project_name', 'completed_work_list', 'inspection_type', 'next_milestone', 'next_start_date', 'week_1_activities', 'week_2_activities', 'project_manager', 'company_name', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 145,
        created_at: '2024-01-14T16:00:00Z',
        updated_at: '2024-01-14T16:00:00Z',
        tags: ['milestone', 'completion', 'progress']
      },
      {
        id: '6',
        user_id: 'user-1',
        name: 'Project Completion Notice',
        category: 'completion_notice',
        subject: 'Your Project is Complete! - {{project_name}}',
        body: `Congratulations, {{client_name}}!

We're thrilled to announce that {{project_name}} is now complete!

PROJECT SUMMARY:
Start Date: {{start_date}}
Completion Date: {{completion_date}}
Final Investment: {{budget_total}}
Total Duration: {{project_duration}} days

FINAL DELIVERABLES:
✓ All punch list items completed
✓ Final inspection passed
✓ Project turnover package prepared
✓ Warranties and manuals compiled
✓ As-built drawings finalized

NEXT STEPS:
1. Final Walk-through: {{walkthrough_date}} at {{walkthrough_time}}
2. Review turnover package with warranties
3. Final payment processing
4. Warranty registration

YOUR TURNOVER PACKAGE INCLUDES:
• All warranties (HVAC, roofing, windows, appliances)
• Maintenance schedules and instructions
• As-built drawings
• Owner manuals for all systems
• Emergency contact information
• Subcontractor contact list

We'll provide both digital and printed copies for your records.

FEEDBACK REQUEST:
We'd love to hear about your experience! Please take a moment to share your feedback:
{{feedback_survey_url}}

ONGOING SUPPORT:
Remember, we're here for you even after completion:
• 1-year workmanship warranty
• Maintenance support and guidance
• Future project consultation

It's been an absolute pleasure working with you on this project. Thank you for trusting {{company_name}} with your vision!

Warmest regards,
{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'project_name', 'start_date', 'completion_date', 'budget_total', 'project_duration', 'walkthrough_date', 'walkthrough_time', 'feedback_survey_url', 'company_name', 'project_manager', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 87,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        tags: ['completion', 'final', 'celebration']
      },
      {
        id: '7',
        user_id: 'user-1',
        name: 'Client Feedback Survey',
        category: 'feedback_form',
        subject: 'We Value Your Feedback - {{project_name}}',
        body: `Hi {{client_name}},

Thank you for choosing {{company_name}} for {{project_name}}!

We're committed to continuous improvement and would greatly appreciate your feedback on your experience.

PLEASE RATE THE FOLLOWING (1-5 stars):

Communication & Responsiveness: ⭐⭐⭐⭐⭐
Quality of Workmanship: ⭐⭐⭐⭐⭐
Adherence to Schedule: ⭐⭐⭐⭐⭐
Budget Management: ⭐⭐⭐⭐⭐
Problem Solving: ⭐⭐⭐⭐⭐
Cleanliness & Site Management: ⭐⭐⭐⭐⭐
Overall Satisfaction: ⭐⭐⭐⭐⭐

OPEN-ENDED QUESTIONS:

1. What did we do particularly well?


2. What could we have done better?


3. Would you recommend us to friends/family? Why or why not?


4. Any additional comments or suggestions?


TESTIMONIAL REQUEST:
If you're happy with our work, would you be willing to provide a testimonial we can share with future clients? We'd be honored!

□ Yes, you may use my feedback as a testimonial
□ Yes, but please keep it anonymous
□ No, this feedback is private only

REVIEW REQUEST:
We'd also greatly appreciate if you could leave a review on:
• Google: {{google_review_url}}
• Yelp: {{yelp_review_url}}
• Facebook: {{facebook_review_url}}

Thank you for your time and for trusting us with your project!

{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'company_name', 'project_name', 'google_review_url', 'yelp_review_url', 'facebook_review_url', 'project_manager', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 112,
        created_at: '2024-01-16T09:00:00Z',
        updated_at: '2024-01-16T09:00:00Z',
        tags: ['feedback', 'survey', 'review']
      },
      {
        id: '8',
        user_id: 'user-1',
        name: 'Weather Delay Notification',
        category: 'email',
        subject: 'Schedule Update: Weather Delay - {{project_name}}',
        body: `Hi {{client_name}},

Due to {{weather_condition}} in the forecast, we need to adjust the schedule for {{project_name}}.

WEATHER IMPACT:
Condition: {{weather_condition}}
Dates Affected: {{affected_dates}}
Affected Activities: {{affected_activities}}

SCHEDULE ADJUSTMENT:
Original Schedule: {{original_schedule}}
Revised Schedule: {{revised_schedule}}
Delay Duration: {{delay_days}} days

REASON FOR DELAY:
{{delay_reason}}

Safety and quality are our top priorities, and proceeding in these conditions could compromise both.

WHAT WE'RE DOING MEANWHILE:
• {{alternative_activity_1}}
• {{alternative_activity_2}}
• Preparing materials for next phase
• Coordinating with subcontractors

UPDATED COMPLETION DATE:
Original: {{completion_date}}
Revised: {{new_completion_date}}

We'll monitor conditions closely and resume work as soon as it's safe to do so. I'll keep you updated on any changes.

Please let me know if you have any questions or concerns.

Best regards,
{{project_manager}}
{{company_name}}
{{pm_phone}} | {{pm_email}}`,
        variables: ['client_name', 'project_name', 'weather_condition', 'affected_dates', 'affected_activities', 'original_schedule', 'revised_schedule', 'delay_days', 'delay_reason', 'alternative_activity_1', 'alternative_activity_2', 'completion_date', 'new_completion_date', 'project_manager', 'company_name', 'pm_phone', 'pm_email'],
        is_public: true,
        usage_count: 67,
        created_at: '2024-01-17T07:00:00Z',
        updated_at: '2024-01-17T07:00:00Z',
        tags: ['weather', 'delay', 'schedule']
      }
    ]

    setTemplates(demoTemplates)
  }

  const loadScheduledCommunications = () => {
    const scheduled: ScheduledCommunication[] = [
      {
        id: 'sch-1',
        template_id: '1',
        project_id: 'proj-101',
        recipients: ['john.smith@email.com'],
        scheduled_date: '2024-02-01T09:00:00Z',
        status: 'scheduled',
        sent_at: null,
        variables: {
          client_name: 'John Smith',
          project_name: 'Kitchen Remodel',
          next_milestone: 'Cabinet Installation'
        }
      },
      {
        id: 'sch-2',
        template_id: '1',
        project_id: 'proj-102',
        recipients: ['mary.jones@email.com'],
        scheduled_date: '2024-02-01T09:00:00Z',
        status: 'scheduled',
        sent_at: null,
        variables: {
          client_name: 'Mary Jones',
          project_name: 'Bathroom Addition',
          next_milestone: 'Tile Installation'
        }
      },
      {
        id: 'sch-3',
        template_id: '5',
        project_id: 'proj-103',
        recipients: ['bob.wilson@email.com'],
        scheduled_date: '2024-01-28T14:00:00Z',
        status: 'sent',
        sent_at: '2024-01-28T14:00:12Z',
        variables: {
          client_name: 'Bob Wilson',
          project_name: 'Deck Construction',
          milestone_name: 'Foundation Complete'
        }
      }
    ]

    setScheduledCommunications(scheduled)
  }

  const loadBulkCommunications = () => {
    const bulk: BulkCommunication[] = [
      {
        id: 'bulk-1',
        template_id: '1',
        project_ids: ['proj-101', 'proj-102', 'proj-103', 'proj-104', 'proj-105'],
        total_recipients: 5,
        sent_count: 5,
        failed_count: 0,
        status: 'completed',
        created_at: '2024-01-25T10:00:00Z',
        completed_at: '2024-01-25T10:05:23Z'
      },
      {
        id: 'bulk-2',
        template_id: '3',
        project_ids: ['proj-106', 'proj-107', 'proj-108'],
        total_recipients: 3,
        sent_count: 2,
        failed_count: 1,
        status: 'completed',
        created_at: '2024-01-20T15:00:00Z',
        completed_at: '2024-01-20T15:02:45Z'
      }
    ]

    setBulkCommunications(bulk)
  }

  const renderPreview = (template: CommunicationTemplate) => {
    let previewText = template.body

    // Replace variables with preview values
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      previewText = previewText.replace(regex, value || `[${key}]`)
    })

    return previewText
  }

  const handleCreateTemplate = () => {
    const newTemplate: CommunicationTemplate = {
      id: `template-${Date.now()}`,
      user_id: 'user-1',
      name: templateName,
      category: templateCategory,
      subject: templateSubject,
      body: templateBody,
      variables: extractVariables(templateBody),
      is_public: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: templateTags
    }

    setTemplates([...templates, newTemplate])

    // Reset form
    setTemplateName('')
    setTemplateCategory('email')
    setTemplateSubject('')
    setTemplateBody('')
    setTemplateTags([])
    setActiveView('templates')

    alert('Template created successfully!')
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/{{([^}]+)}}/g)
    if (!matches) return []
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
  }

  const handleScheduleCommunication = () => {
    if (!selectedTemplate) return

    const newScheduled: ScheduledCommunication = {
      id: `sch-${Date.now()}`,
      template_id: selectedTemplate.id,
      project_id: 'proj-' + Math.floor(Math.random() * 1000),
      recipients: scheduleRecipients,
      scheduled_date: scheduleDate,
      status: 'scheduled',
      sent_at: null,
      variables: previewVariables
    }

    setScheduledCommunications([...scheduledCommunications, newScheduled])
    setShowScheduleModal(false)
    setScheduleDate('')
    setScheduleRecipients([])

    alert('Communication scheduled successfully!')
  }

  const handleBulkSend = () => {
    if (!selectedTemplate) return

    const newBulk: BulkCommunication = {
      id: `bulk-${Date.now()}`,
      template_id: selectedTemplate.id,
      project_ids: selectedProjects,
      total_recipients: selectedProjects.length,
      sent_count: 0,
      failed_count: 0,
      status: 'sending',
      created_at: new Date().toISOString(),
      completed_at: null
    }

    setBulkCommunications([...bulkCommunications, newBulk])

    // Simulate sending
    setTimeout(() => {
      setBulkCommunications(prev => prev.map(b =>
        b.id === newBulk.id
          ? { ...b, status: 'completed', sent_count: selectedProjects.length, completed_at: new Date().toISOString() }
          : b
      ))
      alert(`Successfully sent ${selectedProjects.length} communications!`)
    }, 2000)

    setShowBulkModal(false)
    setSelectedProjects([])
  }

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const categories = [
    { value: 'all', label: 'All Templates', icon: '📋' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'weekly_update', label: 'Weekly Updates', icon: '📅' },
    { value: 'meeting_agenda', label: 'Meeting Agendas', icon: '📝' },
    { value: 'payment_reminder', label: 'Payment Reminders', icon: '💰' },
    { value: 'change_order_request', label: 'Change Orders', icon: '📄' },
    { value: 'milestone_notification', label: 'Milestones', icon: '🎯' },
    { value: 'completion_notice', label: 'Completion Notices', icon: '✅' },
    { value: 'feedback_form', label: 'Feedback Forms', icon: '⭐' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Communication Templates</h1>
              <p className="text-gray-600 mt-1">Professional templates for client communications</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveView('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span>➕</span>
                Create Template
              </button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveView('templates')}
              className={`px-4 py-2 font-medium ${
                activeView === 'templates'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveView('scheduled')}
              className={`px-4 py-2 font-medium ${
                activeView === 'scheduled'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🕐 Scheduled ({scheduledCommunications.filter(s => s.status === 'scheduled').length})
            </button>
            <button
              onClick={() => setActiveView('bulk')}
              className={`px-4 py-2 font-medium ${
                activeView === 'bulk'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📬 Bulk Communications ({bulkCommunications.length})
            </button>
          </div>
        </div>

        {/* Templates View */}
        {activeView === 'templates' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Categories & Search */}
            <div className="col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                        selectedCategory === cat.value
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="text-sm">{cat.label}</span>
                      {cat.value !== 'all' && (
                        <span className="ml-auto text-xs text-gray-500">
                          {templates.filter(t => t.category === cat.value).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle - Template List */}
            <div className="col-span-4">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900">
                    {filteredTemplates.length} Templates
                  </h3>
                </div>
                <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        {template.is_public && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Public</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📊 {template.usage_count} uses</span>
                        <span>🏷️ {template.tags.length} tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Preview */}
            <div className="col-span-5">
              {selectedTemplate ? (
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowScheduleModal(true)
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                          🕐 Schedule
                        </button>
                        <button
                          onClick={() => {
                            setShowBulkModal(true)
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          📬 Bulk Send
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTemplate.body)
                            alert('Template copied to clipboard!')
                          }}
                          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setPreviewMode(false)}
                        className={`px-3 py-1.5 text-sm rounded ${
                          !previewMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Template
                      </button>
                      <button
                        onClick={() => setPreviewMode(true)}
                        className={`px-3 py-1.5 text-sm rounded ${
                          previewMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  <div className="p-6 max-h-[calc(100vh-350px)] overflow-y-auto">
                    {!previewMode ? (
                      <div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                          <div className="px-3 py-2 bg-gray-50 rounded border text-sm">
                            {selectedTemplate.subject}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Body:</label>
                          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border">
                            {selectedTemplate.body}
                          </pre>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Variables ({selectedTemplate.variables.length}):
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTemplate.variables.map((variable, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono"
                              >
                                {'{{' + variable + '}}'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                          <div className="px-3 py-2 bg-white rounded border text-sm font-medium">
                            {renderPreview({ ...selectedTemplate, body: selectedTemplate.subject })}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Body:</label>
                          <div className="bg-white p-4 rounded border">
                            <pre className="whitespace-pre-wrap text-sm">
                              {renderPreview(selectedTemplate)}
                            </pre>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            💡 This is a preview with sample data. Actual communications will use real project data.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4">📧</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Template</h3>
                  <p className="text-gray-600">Choose a template from the list to view and use it</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scheduled Communications View */}
        {activeView === 'scheduled' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900">Scheduled Communications</h3>
              <p className="text-sm text-gray-600 mt-1">Manage automated and scheduled client communications</p>
            </div>
            <div className="divide-y">
              {scheduledCommunications.map(comm => {
                const template = templates.find(t => t.id === comm.template_id)
                return (
                  <div key={comm.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{template?.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          To: {comm.recipients.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 text-sm rounded-full ${
                            comm.status === 'scheduled'
                              ? 'bg-yellow-100 text-yellow-700'
                              : comm.status === 'sent'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}
                        </span>
                        {comm.status === 'scheduled' && (
                          <button
                            onClick={() => {
                              if (confirm('Cancel this scheduled communication?')) {
                                setScheduledCommunications(prev =>
                                  prev.map(c => c.id === comm.id ? { ...c, status: 'cancelled' as const } : c)
                                )
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Scheduled for:</span>
                        <span className="ml-2 font-medium">
                          {new Date(comm.scheduled_date).toLocaleString()}
                        </span>
                      </div>
                      {comm.sent_at && (
                        <div>
                          <span className="text-gray-500">Sent at:</span>
                          <span className="ml-2 font-medium">
                            {new Date(comm.sent_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {scheduledCommunications.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🕐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Communications</h3>
                  <p className="text-gray-600">Schedule communications from the Templates tab</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Communications View */}
        {activeView === 'bulk' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900">Bulk Communications</h3>
              <p className="text-sm text-gray-600 mt-1">Send the same communication to multiple projects at once</p>
            </div>
            <div className="divide-y">
              {bulkCommunications.map(bulk => {
                const template = templates.find(t => t.id === bulk.template_id)
                return (
                  <div key={bulk.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{template?.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {bulk.total_recipients} recipients across {bulk.project_ids.length} projects
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          bulk.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : bulk.status === 'sending'
                            ? 'bg-blue-100 text-blue-700'
                            : bulk.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {bulk.status.charAt(0).toUpperCase() + bulk.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Sent:</span>
                        <span className="ml-2 font-medium text-green-600">{bulk.sent_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Failed:</span>
                        <span className="ml-2 font-medium text-red-600">{bulk.failed_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">{bulk.total_recipients}</span>
                      </div>
                    </div>
                    {bulk.status === 'completed' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(bulk.sent_count / bulk.total_recipients) * 100}%` }}
                        ></div>
                      </div>
                    )}
                    <div className="mt-3 text-xs text-gray-500">
                      Created: {new Date(bulk.created_at).toLocaleString()}
                      {bulk.completed_at && ` • Completed: ${new Date(bulk.completed_at).toLocaleString()}`}
                    </div>
                  </div>
                )
              })}
              {bulkCommunications.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📬</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bulk Communications</h3>
                  <p className="text-gray-600">Send bulk communications from the Templates tab</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Template View */}
        {activeView === 'create' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Template</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Project Update"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as TemplateCategory)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="email">Email</option>
                  <option value="weekly_update">Weekly Update</option>
                  <option value="meeting_agenda">Meeting Agenda</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="change_order_request">Change Order Request</option>
                  <option value="milestone_notification">Milestone Notification</option>
                  <option value="completion_notice">Completion Notice</option>
                  <option value="feedback_form">Feedback Form</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="Use {{variable_name}} for dynamic content"
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: Weekly Update: {'{{project_name}}'} - Week of {'{{current_date}}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={15}
                  placeholder="Write your template here. Use {{variable_name}} for dynamic content."
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available variables: client_name, project_name, project_address, start_date, completion_date,
                  budget_total, company_name, project_manager, pm_phone, pm_email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., weekly, update, progress"
                  onChange={(e) => setTemplateTags(e.target.value.split(',').map(t => t.trim()))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {templateBody && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Detected Variables:</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractVariables(templateBody).map((variable, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                        {'{{' + variable + '}}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreateTemplate}
                  disabled={!templateName || !templateSubject || !templateBody}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Template
                </button>
                <button
                  onClick={() => setActiveView('templates')}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Communication</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                  <div className="px-3 py-2 bg-gray-50 rounded border text-sm">
                    {selectedTemplate.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients (comma-separated emails)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="client@email.com, client2@email.com"
                    onChange={(e) => setScheduleRecipients(e.target.value.split(',').map(e => e.trim()))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleScheduleCommunication}
                    disabled={!scheduleDate || scheduleRecipients.length === 0}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Send Modal */}
        {showBulkModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Send Communication</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                  <div className="px-3 py-2 bg-gray-50 rounded border text-sm">
                    {selectedTemplate.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Projects</label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {['Kitchen Remodel - John Smith', 'Bathroom Addition - Mary Jones', 'Deck Construction - Bob Wilson',
                      'Basement Finish - Lisa Brown', 'Master Suite Addition - Tom Davis'].map((project, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(`proj-${i}`)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects([...selectedProjects, `proj-${i}`])
                            } else {
                              setSelectedProjects(selectedProjects.filter(p => p !== `proj-${i}`))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{project}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedProjects.length} projects selected
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This will send {selectedProjects.length} communications immediately. Make sure the template
                    is finalized before proceeding.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleBulkSend}
                    disabled={selectedProjects.length === 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                  >
                    Send to {selectedProjects.length} Projects
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkModal(false)
                      setSelectedProjects([])
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
