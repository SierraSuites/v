/**
 * CLIENT COMMUNICATION INTEGRATION LAYER
 *
 * Integrates client communication tools with existing platform data:
 * - FieldSnap photos for reports and proposals
 * - Projects data for budgets, schedules, and progress
 * - CRM contacts for client information
 * - QuoteHub for proposal generation
 * - TaskFlow for timeline data
 */

import { createClient } from '@/lib/supabase/client'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface FieldSnapPhoto {
  id: string
  project_id: string
  file_url: string
  thumbnail_url: string
  caption: string
  location: string
  taken_at: string
  uploaded_by: string
  tags: string[]
  category: string
}

export interface ProjectData {
  id: string
  name: string
  client_name: string
  client_email: string
  client_phone: string
  budget: number
  spent_to_date: number
  completion_percentage: number
  start_date: string
  target_end_date: string
  actual_end_date: string | null
  status: string
  address: string
  project_type: string
}

export interface ProjectSchedule {
  project_id: string
  milestones: {
    name: string
    target_date: string
    actual_date: string | null
    status: 'completed' | 'in_progress' | 'upcoming' | 'delayed'
    completion_percentage: number
  }[]
  current_phase: string
  days_ahead_or_behind: number
}

export interface CRMContact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  contact_type: 'client' | 'lead' | 'subcontractor' | 'supplier'
  tags: string[]
  notes: string
}

export interface QuoteData {
  id: string
  project_name: string
  client_id: string
  client_name: string
  total_min: number
  total_max: number
  line_items: {
    category: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    min: number
    max: number
  }[]
  notes: string
  valid_until: string
  created_at: string
}

export interface BudgetBreakdown {
  project_id: string
  categories: {
    category: string
    budgeted: number
    spent: number
    remaining: number
    percentage_used: number
    variance: number
  }[]
  change_orders: {
    id: string
    description: string
    amount: number
    status: string
    approved_date: string | null
  }[]
  total_change_orders: number
}

// =====================================================
// FIELDSNAP INTEGRATION
// =====================================================

export class FieldSnapIntegration {
  private supabase = createClient()

  /**
   * Get all photos for a project
   */
  async getProjectPhotos(projectId: string): Promise<FieldSnapPhoto[]> {
    const { data, error } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false })

    if (error) {
      console.error('Error fetching FieldSnap photos:', error)
      return []
    }

    return data || []
  }

  /**
   * Get photos filtered by date range (for weekly reports)
   */
  async getPhotosByDateRange(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<FieldSnapPhoto[]> {
    const { data, error } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .gte('taken_at', startDate)
      .lte('taken_at', endDate)
      .order('taken_at', { ascending: false })

    if (error) {
      console.error('Error fetching photos by date range:', error)
      return []
    }

    return data || []
  }

  /**
   * Get photos by category (for organized reports)
   */
  async getPhotosByCategory(
    projectId: string,
    category: string
  ): Promise<FieldSnapPhoto[]> {
    const { data, error } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .eq('category', category)
      .order('taken_at', { ascending: false })

    if (error) {
      console.error('Error fetching photos by category:', error)
      return []
    }

    return data || []
  }

  /**
   * Get photos by location (for site-specific reports)
   */
  async getPhotosByLocation(
    projectId: string,
    location: string
  ): Promise<FieldSnapPhoto[]> {
    const { data, error } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .ilike('location', `%${location}%`)
      .order('taken_at', { ascending: false })

    if (error) {
      console.error('Error fetching photos by location:', error)
      return []
    }

    return data || []
  }

  /**
   * Get before/after photo pairs
   */
  async getBeforeAfterPhotos(projectId: string): Promise<{
    before: FieldSnapPhoto[]
    after: FieldSnapPhoto[]
  }> {
    const { data: beforePhotos } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .contains('tags', ['before'])
      .order('taken_at', { ascending: true })

    const { data: afterPhotos } = await this.supabase
      .from('fieldsnap_photos')
      .select('*')
      .eq('project_id', projectId)
      .contains('tags', ['after'])
      .order('taken_at', { ascending: false })

    return {
      before: beforePhotos || [],
      after: afterPhotos || []
    }
  }

  /**
   * Get recent photos for weekly reports (last 7 days)
   */
  async getWeeklyPhotos(projectId: string): Promise<FieldSnapPhoto[]> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return this.getPhotosByDateRange(
      projectId,
      sevenDaysAgo.toISOString(),
      new Date().toISOString()
    )
  }

  /**
   * Get photo categories for a project
   */
  async getPhotoCategories(projectId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('fieldsnap_photos')
      .select('category')
      .eq('project_id', projectId)

    if (error || !data) return []

    const categories = [...new Set(data.map(d => d.category).filter(Boolean))]
    return categories
  }
}

// =====================================================
// PROJECTS INTEGRATION
// =====================================================

export class ProjectsIntegration {
  private supabase = createClient()

  /**
   * Get full project data including client info
   */
  async getProject(projectId: string): Promise<ProjectData | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      return null
    }

    return data
  }

  /**
   * Get all active projects for user
   */
  async getActiveProjects(userId: string): Promise<ProjectData[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return []
    }

    return data || []
  }

  /**
   * Get project budget breakdown
   */
  async getBudgetBreakdown(projectId: string): Promise<BudgetBreakdown | null> {
    // Get budget categories
    const { data: categories, error: catError } = await this.supabase
      .from('project_budget_categories')
      .select('*')
      .eq('project_id', projectId)

    if (catError) {
      console.error('Error fetching budget categories:', catError)
      return null
    }

    // Get change orders
    const { data: changeOrders, error: coError } = await this.supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (coError) {
      console.error('Error fetching change orders:', coError)
    }

    const totalChangeOrders = (changeOrders || [])
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + co.amount, 0)

    return {
      project_id: projectId,
      categories: (categories || []).map(cat => ({
        category: cat.category_name,
        budgeted: cat.budgeted_amount,
        spent: cat.spent_amount,
        remaining: cat.budgeted_amount - cat.spent_amount,
        percentage_used: (cat.spent_amount / cat.budgeted_amount) * 100,
        variance: cat.budgeted_amount - cat.spent_amount
      })),
      change_orders: (changeOrders || []).map(co => ({
        id: co.id,
        description: co.description,
        amount: co.amount,
        status: co.status,
        approved_date: co.approved_date
      })),
      total_change_orders: totalChangeOrders
    }
  }

  /**
   * Get project schedule and milestones
   */
  async getProjectSchedule(projectId: string): Promise<ProjectSchedule | null> {
    const { data: milestones, error } = await this.supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('target_date', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return null
    }

    // Calculate days ahead/behind
    const now = new Date()
    let daysAheadOrBehind = 0

    if (milestones && milestones.length > 0) {
      const currentMilestone = milestones.find(m => m.status === 'in_progress')
      if (currentMilestone) {
        const targetDate = new Date(currentMilestone.target_date)
        const diffTime = targetDate.getTime() - now.getTime()
        daysAheadOrBehind = Math.round(diffTime / (1000 * 60 * 60 * 24))
      }
    }

    const currentPhase = milestones?.find(m => m.status === 'in_progress')?.name || 'Not Started'

    return {
      project_id: projectId,
      milestones: (milestones || []).map(m => ({
        name: m.name,
        target_date: m.target_date,
        actual_date: m.actual_completion_date,
        status: m.status,
        completion_percentage: m.completion_percentage || 0
      })),
      current_phase: currentPhase,
      days_ahead_or_behind: daysAheadOrBehind
    }
  }

  /**
   * Get project team members
   */
  async getProjectTeam(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_team_members')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      console.error('Error fetching project team:', error)
      return []
    }

    return data || []
  }

  /**
   * Calculate project health score
   */
  async calculateProjectHealth(projectId: string): Promise<{
    score: number
    factors: { factor: string; score: number; weight: number }[]
  }> {
    const project = await this.getProject(projectId)
    const schedule = await this.getProjectSchedule(projectId)
    const budget = await this.getBudgetBreakdown(projectId)

    if (!project) {
      return { score: 0, factors: [] }
    }

    const factors = []

    // Schedule health (40% weight)
    let scheduleScore = 100
    if (schedule && schedule.days_ahead_or_behind < 0) {
      scheduleScore = Math.max(0, 100 - Math.abs(schedule.days_ahead_or_behind) * 2)
    } else if (schedule && schedule.days_ahead_or_behind > 0) {
      scheduleScore = 100 // Ahead of schedule
    }
    factors.push({ factor: 'Schedule', score: scheduleScore, weight: 0.4 })

    // Budget health (40% weight)
    let budgetScore = 100
    if (budget && budget.categories.length > 0) {
      const avgVariance = budget.categories.reduce((sum, cat) =>
        sum + (cat.variance / cat.budgeted * 100), 0
      ) / budget.categories.length
      budgetScore = Math.max(0, Math.min(100, 100 + avgVariance))
    }
    factors.push({ factor: 'Budget', score: budgetScore, weight: 0.4 })

    // Progress health (20% weight)
    const progressScore = project.completion_percentage || 0
    factors.push({ factor: 'Progress', score: progressScore, weight: 0.2 })

    // Calculate weighted score
    const totalScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0)

    return {
      score: Math.round(totalScore),
      factors
    }
  }
}

// =====================================================
// CRM INTEGRATION
// =====================================================

export class CRMIntegration {
  private supabase = createClient()

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<CRMContact | null> {
    const { data, error } = await this.supabase
      .from('crm_contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (error) {
      console.error('Error fetching contact:', error)
      return null
    }

    return data
  }

  /**
   * Get all clients
   */
  async getClients(userId: string): Promise<CRMContact[]> {
    const { data, error } = await this.supabase
      .from('crm_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_type', 'client')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching clients:', error)
      return []
    }

    return data || []
  }

  /**
   * Search contacts by name or email
   */
  async searchContacts(userId: string, query: string): Promise<CRMContact[]> {
    const { data, error } = await this.supabase
      .from('crm_contacts')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Error searching contacts:', error)
      return []
    }

    return data || []
  }

  /**
   * Get client communication history
   */
  async getClientCommunications(contactId: string) {
    const { data, error } = await this.supabase
      .from('client_communications_log')
      .select('*')
      .contains('sent_to', [contactId])
      .order('sent_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching communications:', error)
      return []
    }

    return data || []
  }
}

// =====================================================
// QUOTEHUB INTEGRATION
// =====================================================

export class QuoteHubIntegration {
  private supabase = createClient()

  /**
   * Get quote by ID
   */
  async getQuote(quoteId: string): Promise<QuoteData | null> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (error) {
      console.error('Error fetching quote:', error)
      return null
    }

    // Get line items
    const { data: lineItems } = await this.supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('order_index', { ascending: true })

    return {
      ...data,
      line_items: lineItems || []
    }
  }

  /**
   * Get all quotes for user
   */
  async getUserQuotes(userId: string): Promise<QuoteData[]> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quotes:', error)
      return []
    }

    return data || []
  }

  /**
   * Get quotes for a specific project
   */
  async getProjectQuotes(projectId: string): Promise<QuoteData[]> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching project quotes:', error)
      return []
    }

    return data || []
  }
}

// =====================================================
// TASKFLOW INTEGRATION
// =====================================================

export class TaskFlowIntegration {
  private supabase = createClient()

  /**
   * Get upcoming tasks for a project
   */
  async getUpcomingTasks(projectId: string, days: number = 7) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['pending', 'in_progress'])
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching upcoming tasks:', error)
      return []
    }

    return data || []
  }

  /**
   * Get completed tasks for a date range (for weekly reports)
   */
  async getCompletedTasks(projectId: string, startDate: string, endDate: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Error fetching completed tasks:', error)
      return []
    }

    return data || []
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(projectId: string) {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', now)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching overdue tasks:', error)
      return []
    }

    return data || []
  }
}

// =====================================================
// UNIFIED CLIENT COMMUNICATION SERVICE
// =====================================================

export class ClientCommunicationService {
  public fieldsnap: FieldSnapIntegration
  public projects: ProjectsIntegration
  public crm: CRMIntegration
  public quotes: QuoteHubIntegration
  public taskflow: TaskFlowIntegration

  constructor() {
    this.fieldsnap = new FieldSnapIntegration()
    this.projects = new ProjectsIntegration()
    this.crm = new CRMIntegration()
    this.quotes = new QuoteHubIntegration()
    this.taskflow = new TaskFlowIntegration()
  }

  /**
   * Generate complete weekly report data
   */
  async generateWeeklyReportData(projectId: string) {
    const [
      project,
      weeklyPhotos,
      schedule,
      budget,
      completedTasks,
      upcomingTasks,
      health
    ] = await Promise.all([
      this.projects.getProject(projectId),
      this.fieldsnap.getWeeklyPhotos(projectId),
      this.projects.getProjectSchedule(projectId),
      this.projects.getBudgetBreakdown(projectId),
      this.taskflow.getCompletedTasks(
        projectId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      ),
      this.taskflow.getUpcomingTasks(projectId, 7),
      this.projects.calculateProjectHealth(projectId)
    ])

    return {
      project,
      photos: weeklyPhotos,
      schedule,
      budget,
      completed_this_week: completedTasks,
      upcoming_next_week: upcomingTasks,
      health_score: health
    }
  }

  /**
   * Generate complete proposal data from quote
   */
  async generateProposalData(quoteId: string) {
    const quote = await this.quotes.getQuote(quoteId)
    if (!quote) return null

    const [client, projectPhotos] = await Promise.all([
      quote.client_id ? this.crm.getContact(quote.client_id) : null,
      quote.project_id ? this.fieldsnap.getProjectPhotos(quote.project_id) : []
    ])

    return {
      quote,
      client,
      portfolio_photos: projectPhotos.slice(0, 12)
    }
  }

  /**
   * Generate project completion report data
   */
  async generateCompletionReportData(projectId: string) {
    const [
      project,
      beforeAfterPhotos,
      allPhotos,
      budget,
      schedule,
      team
    ] = await Promise.all([
      this.projects.getProject(projectId),
      this.fieldsnap.getBeforeAfterPhotos(projectId),
      this.fieldsnap.getProjectPhotos(projectId),
      this.projects.getBudgetBreakdown(projectId),
      this.projects.getProjectSchedule(projectId),
      this.projects.getProjectTeam(projectId)
    ])

    return {
      project,
      before_after_photos: beforeAfterPhotos,
      final_photos: allPhotos.slice(0, 20),
      final_budget: budget,
      timeline_review: schedule,
      project_team: team
    }
  }

  /**
   * Get all data needed for client communication
   */
  async getProjectCommunicationData(projectId: string) {
    const [
      project,
      photos,
      schedule,
      budget,
      health,
      team,
      upcomingTasks,
      overdueTasks
    ] = await Promise.all([
      this.projects.getProject(projectId),
      this.fieldsnap.getProjectPhotos(projectId),
      this.projects.getProjectSchedule(projectId),
      this.projects.getBudgetBreakdown(projectId),
      this.projects.calculateProjectHealth(projectId),
      this.projects.getProjectTeam(projectId),
      this.taskflow.getUpcomingTasks(projectId),
      this.taskflow.getOverdueTasks(projectId)
    ])

    return {
      project,
      photos,
      schedule,
      budget,
      health,
      team,
      upcoming_tasks: upcomingTasks,
      overdue_tasks: overdueTasks
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const clientCommunication = new ClientCommunicationService()

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format currency for reports
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date for reports
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    completed: 'green',
    in_progress: 'blue',
    upcoming: 'gray',
    delayed: 'red',
    on_hold: 'yellow'
  }
  return colors[status] || 'gray'
}

/**
 * Get health score color
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}
