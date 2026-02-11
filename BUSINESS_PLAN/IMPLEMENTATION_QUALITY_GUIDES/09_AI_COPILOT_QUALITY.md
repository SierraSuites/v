# AI COPILOT - IMPLEMENTATION QUALITY GUIDE

**Module**: AI-Powered Assistant & Automation (Module 09)
**Business Purpose**: Predictive insights, smart suggestions, automated documentation, voice commands
**Target Quality**: 90%+ before launch
**Priority**: CRITICAL - Competitive differentiator

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Intelligent Construction Assistant

**Standard**: AI responses MUST be contextually relevant to construction. Response time MUST be <3 seconds. AI MUST cite specific data (project names, numbers, dates). Hallucination rate MUST be <1%.

**Why It Matters**: Generic AI assistants fail in construction. Example: User asks "What needs attention today?" Generic AI gives vague answer. Construction-specific AI responds: "3 critical items: Concrete pour Thursday at risk (80% rain), Johnson quote expires tomorrow (82% win probability), electrical inspection failed (3 missing GFCI outlets on Floor 2)." This saves 30 minutes of manual dashboard review.

**Database Schema**:
```sql
-- AI interaction history (for learning and improvement)
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation
  conversation_id UUID NOT NULL, -- Group related messages
  message_order INT NOT NULL, -- Position in conversation

  -- User input
  user_message TEXT NOT NULL,
  user_intent TEXT, -- Detected intent: 'question', 'command', 'feedback'

  -- AI response
  ai_response TEXT NOT NULL,
  response_type TEXT, -- 'answer', 'suggestion', 'error', 'clarification'

  -- Context used
  context_data JSONB NOT NULL, -- What data was used to generate response
  /* Example:
  {
    "active_projects": [{"id": "...", "name": "..."}],
    "overdue_tasks": 5,
    "budget_alerts": 2,
    "weather_forecast": {...}
  }
  */

  -- AI model details
  model_used VARCHAR(100) NOT NULL, -- 'claude-3-5-sonnet-20241022'
  tokens_used INT,
  response_time_ms INT,

  -- Quality tracking
  user_rating INT, -- 1-5 stars (null if not rated)
  user_feedback TEXT,
  was_helpful BOOLEAN,

  -- Actions taken
  suggested_actions JSONB, -- Buttons shown to user
  action_taken VARCHAR(255), -- Which button user clicked

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_interactions_company ON ai_interactions(company_id, created_at DESC);
CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id, created_at DESC);
CREATE INDEX idx_ai_interactions_conversation ON ai_interactions(conversation_id, message_order);
CREATE INDEX idx_ai_interactions_rating ON ai_interactions(user_rating) WHERE user_rating IS NOT NULL;

-- AI predictions (for tracking accuracy)
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Prediction details
  prediction_type TEXT NOT NULL, -- 'completion_date', 'final_cost', 'quality_score', 'risk_level'
  predicted_value JSONB NOT NULL,
  confidence_percentage INT NOT NULL CHECK (confidence_percentage BETWEEN 0 AND 100),

  -- Basis for prediction
  factors_considered JSONB NOT NULL,
  /* Example:
  {
    "historical_projects": 15,
    "current_progress": 0.65,
    "budget_utilization": 0.72,
    "weather_impact": "low",
    "team_performance": "above_average"
  }
  */

  -- Actual outcome (for accuracy tracking)
  actual_value JSONB,
  actual_recorded_at TIMESTAMPTZ,
  prediction_accuracy DECIMAL(5, 2), -- How close was the prediction (0-100%)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'ai_system'
);

CREATE INDEX idx_ai_predictions_project ON ai_predictions(project_id, created_at DESC);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_accuracy ON ai_predictions(prediction_accuracy) WHERE prediction_accuracy IS NOT NULL;

-- AI automation rules
CREATE TABLE ai_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Automation config
  automation_type TEXT NOT NULL, -- 'daily_report', 'photo_analysis', 'schedule_optimization', 'budget_alert'
  trigger_conditions JSONB NOT NULL,
  /* Example:
  {
    "frequency": "daily",
    "time": "06:00",
    "conditions": {
      "project_status": ["active"],
      "has_updates": true
    }
  }
  */

  actions JSONB NOT NULL,
  /* Example:
  {
    "generate_report": true,
    "send_email": true,
    "create_tasks": false,
    "recipients": ["project_manager", "superintendent"]
  }
  */

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,

  -- Performance
  avg_execution_time_ms INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_ai_automations_company ON ai_automations(company_id, is_active);
CREATE INDEX idx_ai_automations_next_run ON ai_automations(next_run_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_automations ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI interactions
CREATE POLICY "Users can view own AI interactions"
  ON ai_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create AI interactions
CREATE POLICY "Users can create AI interactions"
  ON ai_interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- Users can update their own interactions (for rating/feedback)
CREATE POLICY "Users can rate AI interactions"
  ON ai_interactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can view predictions for their company's projects
CREATE POLICY "Users can view company predictions"
  ON ai_predictions FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- Users can view and manage company automations
CREATE POLICY "Users can view company automations"
  ON ai_automations FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage automations"
  ON ai_automations FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'settings'->>'edit' = 'true'
    )
  );

-- Function to calculate prediction accuracy
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
  p_prediction_id UUID,
  p_actual_value JSONB
)
RETURNS DECIMAL AS $$
DECLARE
  v_predicted_value JSONB;
  v_prediction_type TEXT;
  v_accuracy DECIMAL;
BEGIN
  SELECT predicted_value, prediction_type
  INTO v_predicted_value, v_prediction_type
  FROM ai_predictions
  WHERE id = p_prediction_id;

  -- Calculate accuracy based on type
  IF v_prediction_type = 'completion_date' THEN
    -- Days difference between predicted and actual
    v_accuracy := 100 - LEAST(100, ABS(
      EXTRACT(EPOCH FROM (p_actual_value->>'date')::timestamptz - (v_predicted_value->>'date')::timestamptz) / 86400
    ) * 5); -- Each day off = -5%

  ELSIF v_prediction_type = 'final_cost' THEN
    -- Percentage difference
    v_accuracy := 100 - LEAST(100, ABS(
      ((p_actual_value->>'amount')::numeric - (v_predicted_value->>'amount')::numeric) /
      (v_predicted_value->>'amount')::numeric * 100
    ));

  ELSE
    -- Generic numeric comparison
    v_accuracy := 100 - LEAST(100, ABS(
      (p_actual_value->>'value')::numeric - (v_predicted_value->>'value')::numeric
    ));
  END IF;

  -- Update prediction record
  UPDATE ai_predictions
  SET
    actual_value = p_actual_value,
    actual_recorded_at = NOW(),
    prediction_accuracy = v_accuracy
  WHERE id = p_prediction_id;

  RETURN v_accuracy;
END;
$$ LANGUAGE plpgsql;
```

**API Implementation**:
```typescript
// lib/ai/copilot.ts

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface CopilotContext {
  userId: string
  companyId: string
  currentProjects?: any[]
  recentTasks?: any[]
  budgetStatus?: any[]
  weatherForecast?: any
  upcomingEvents?: any[]
}

export async function queryAICopilot(
  userMessage: string,
  context: CopilotContext,
  conversationId?: string
) {
  const supabase = createClient()

  // Generate conversation ID if not provided
  const convId = conversationId || crypto.randomUUID()

  // Build rich context
  const systemPrompt = buildConstructionContext(context)

  // Get conversation history
  let conversationHistory: any[] = []
  if (conversationId) {
    const { data: history } = await supabase
      .from('ai_interactions')
      .select('user_message, ai_response')
      .eq('conversation_id', conversationId)
      .order('message_order', { ascending: true })
      .limit(10)

    conversationHistory = history || []
  }

  // Build messages array
  const messages: Anthropic.MessageParam[] = conversationHistory.flatMap(h => [
    { role: 'user', content: h.user_message },
    { role: 'assistant', content: h.ai_response },
  ])
  messages.push({ role: 'user', content: userMessage })

  // Call Claude API
  const startTime = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  const responseTime = Date.now() - startTime
  const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract suggested actions from response
  const suggestedActions = extractActionsFromResponse(aiResponse)

  // Log interaction
  const messageOrder = conversationHistory.length
  const { data: interaction } = await supabase
    .from('ai_interactions')
    .insert({
      company_id: context.companyId,
      user_id: context.userId,
      conversation_id: convId,
      message_order: messageOrder,
      user_message: userMessage,
      ai_response: aiResponse,
      context_data: context,
      model_used: 'claude-3-5-sonnet-20241022',
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
      response_time_ms: responseTime,
      suggested_actions: suggestedActions,
    })
    .select()
    .single()

  return {
    response: aiResponse,
    conversationId: convId,
    interactionId: interaction?.id,
    suggestedActions,
    responseTime,
  }
}

function buildConstructionContext(context: CopilotContext): string {
  const { currentProjects, recentTasks, budgetStatus, weatherForecast, upcomingEvents } = context

  return `You are Sierra, an AI construction management assistant specialized in helping contractors manage projects efficiently.

CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

COMPANY CONTEXT:
You are assisting a construction company with the following active projects and data.

ACTIVE PROJECTS (${currentProjects?.length || 0}):
${currentProjects?.map(p => `
- ${p.name} (${p.status})
  Budget: $${p.estimated_budget?.toLocaleString()} (${p.budget_utilization}% used)
  Progress: ${p.progress}% complete
  Timeline: ${p.start_date} to ${p.target_completion}
  Team: ${p.team_size} members
  Location: ${p.location || 'Not specified'}
`).join('\n') || 'No active projects'}

RECENT TASKS (${recentTasks?.length || 0}):
${recentTasks?.slice(0, 10).map(t => `
- ${t.title} (${t.status})
  Project: ${t.project_name}
  ${t.assignee_name ? `Assigned to: ${t.assignee_name}` : 'Unassigned'}
  ${t.due_date ? `Due: ${t.due_date}` : ''}
  ${t.is_overdue ? '⚠️ OVERDUE' : ''}
`).join('\n') || 'No recent tasks'}

BUDGET ALERTS:
${budgetStatus?.filter(b => b.utilization > 90).map(b => `
- ${b.project_name}: ${b.utilization}% of budget used, ${b.percent_complete}% complete
  ${b.utilization > b.percent_complete + 10 ? '⚠️ OVER-BUDGET RISK' : ''}
`).join('\n') || 'All projects on budget'}

WEATHER FORECAST (Next 7 Days):
${weatherForecast ? `
${weatherForecast.map((day: any) => `
- ${day.date}: ${day.condition}, ${day.temp}°F, ${day.precipitation}% chance of rain
  ${day.precipitation > 70 ? '⚠️ HIGH RAIN RISK - May affect outdoor work' : ''}
`).join('\n')}
` : 'Weather data not available'}

UPCOMING EVENTS:
${upcomingEvents?.slice(0, 5).map(e => `
- ${e.title} (${e.type})
  Date: ${e.date}
  ${e.project_name ? `Project: ${e.project_name}` : ''}
`).join('\n') || 'No upcoming events'}

YOUR ROLE:
1. Proactively identify issues and risks
2. Provide actionable recommendations with specific data
3. Answer questions with construction context
4. Suggest next best actions
5. Speak concisely like an experienced construction professional
6. Always cite specific data (project names, numbers, dates)
7. Flag critical issues (safety, budget overruns, schedule delays)

RESPONSE GUIDELINES:
- Be direct and action-oriented
- Use bullet points for lists
- Highlight urgent items with ⚠️ or 🔴
- Suggest specific actions with [Action Button] format
- Reference specific project names and numbers
- Avoid generic advice - be construction-specific

When suggesting actions, format them like:
[Reschedule Concrete Pour] [View Weather Details] [Create Change Order]

The user will see these as clickable buttons.`
}

function extractActionsFromResponse(response: string): any[] {
  // Extract [Action Button] patterns
  const actionPattern = /\[([^\]]+)\]/g
  const matches = response.match(actionPattern)

  if (!matches) return []

  return matches.map(match => {
    const label = match.slice(1, -1) // Remove brackets
    return {
      label,
      action: inferActionType(label),
    }
  })
}

function inferActionType(label: string): string {
  const lowercaseLabel = label.toLowerCase()

  if (lowercaseLabel.includes('reschedule')) return 'reschedule_task'
  if (lowercaseLabel.includes('create') && lowercaseLabel.includes('task')) return 'create_task'
  if (lowercaseLabel.includes('view') || lowercaseLabel.includes('details')) return 'view_details'
  if (lowercaseLabel.includes('change order')) return 'create_change_order'
  if (lowercaseLabel.includes('follow up')) return 'create_reminder'
  if (lowercaseLabel.includes('schedule')) return 'schedule_event'

  return 'custom_action'
}

// Generate daily briefing
export async function generateDailyBriefing(userId: string, companyId: string) {
  const supabase = createClient()

  // Gather comprehensive context
  const [
    { data: projects },
    { data: tasks },
    { data: quotes },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('company_id', companyId).eq('status', 'active'),
    supabase.from('tasks').select('*, project:projects(name)').eq('company_id', companyId).gte('due_date', new Date().toISOString()).order('due_date'),
    supabase.from('quotes').select('*').eq('company_id', companyId).eq('status', 'sent'),
    supabase.from('calendar_events').select('*').eq('company_id', companyId).gte('start_time', new Date().toISOString()),
  ])

  // Calculate budget status
  const budgetStatus = projects?.map(p => ({
    project_name: p.name,
    utilization: (p.actual_cost / p.estimated_budget) * 100,
    percent_complete: p.progress,
  }))

  // Get weather forecast (example using external API)
  const weatherForecast = await getWeatherForecast(projects?.[0]?.location)

  const message = "What needs my attention today?"

  return queryAICopilot(message, {
    userId,
    companyId,
    currentProjects: projects,
    recentTasks: tasks,
    budgetStatus,
    weatherForecast,
    upcomingEvents,
  })
}

async function getWeatherForecast(location?: string): Promise<any[] | null> {
  if (!location || !process.env.WEATHER_API_KEY) return null

  try {
    // Example: OpenWeatherMap API
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${process.env.WEATHER_API_KEY}&units=imperial`
    )
    const data = await response.json()

    // Process forecast data
    return data.list?.slice(0, 7).map((item: any) => ({
      date: new Date(item.dt * 1000).toLocaleDateString(),
      condition: item.weather[0].main,
      temp: Math.round(item.main.temp),
      precipitation: item.pop * 100,
    }))
  } catch (error) {
    console.error('Weather forecast error:', error)
    return null
  }
}
```

**API Endpoints**:
```typescript
// app/api/ai/chat/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { queryAICopilot } from '@/lib/ai/copilot'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { message, conversationId } = await req.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Get context data
    const [
      { data: projects },
      { data: tasks },
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('status', 'active'),
      supabase
        .from('tasks')
        .select('*, project:projects(name)')
        .eq('company_id', profile.company_id)
        .order('due_date'),
    ])

    // Query AI
    const result = await queryAICopilot(message, {
      userId: user.id,
      companyId: profile.company_id,
      currentProjects: projects || [],
      recentTasks: tasks || [],
    }, conversationId)

    return NextResponse.json(result)

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

// app/api/ai/daily-briefing/route.ts

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    const briefing = await generateDailyBriefing(user.id, profile.company_id)

    return NextResponse.json(briefing)

  } catch (error) {
    console.error('Daily briefing error:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily briefing' },
      { status: 500 }
    )
  }
}

// app/api/ai/feedback/route.ts

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { interactionId, rating, feedback, wasHelpful } = await req.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update interaction with feedback
    const { error } = await supabase
      .from('ai_interactions')
      .update({
        user_rating: rating,
        user_feedback: feedback,
        was_helpful: wasHelpful,
      })
      .eq('id', interactionId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
```

**UI Implementation**:
```typescript
// components/ai/AICopilotChat.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  SparklesIcon,
  SendIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  MicIcon,
  RefreshCwIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestedActions?: { label: string; action: string }[]
  interactionId?: string
}

export function AICopilotChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch daily briefing on mount
  const { data: briefingData, refetch: refetchBriefing } = useQuery({
    queryKey: ['daily-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/ai/daily-briefing')
      if (!res.ok) throw new Error('Failed to fetch daily briefing')
      return res.json()
    },
  })

  useEffect(() => {
    if (briefingData) {
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: briefingData.response,
        timestamp: new Date(),
        suggestedActions: briefingData.suggestedActions,
        interactionId: briefingData.interactionId,
      }])
      setConversationId(briefingData.conversationId)
    }
  }, [briefingData])

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId }),
      })

      if (!res.ok) throw new Error('Failed to send message')
      return res.json()
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestedActions: data.suggestedActions,
        interactionId: data.interactionId,
      }])
      setConversationId(data.conversationId)
    },
  })

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ interactionId, rating, wasHelpful }: any) => {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId, rating, wasHelpful }),
      })

      if (!res.ok) throw new Error('Failed to send feedback')
      return res.json()
    },
  })

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message immediately
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }])

    sendMessageMutation.mutate(input)
    setInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFeedback = (interactionId: string, wasHelpful: boolean) => {
    feedbackMutation.mutate({
      interactionId,
      wasHelpful,
      rating: wasHelpful ? 5 : 2
    })
  }

  const handleActionClick = (action: { label: string; action: string }) => {
    // Handle different action types
    console.log('Action clicked:', action)
    // TODO: Implement action handlers (reschedule, create task, etc.)
  }

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5" />
          <h3 className="font-semibold">Sierra AI Copilot</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchBriefing()}
          className="text-white hover:bg-white/20"
        >
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          Refresh Briefing
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    <SparklesIcon className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'flex flex-col gap-2 max-w-[80%]',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-4 py-2',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>

                {/* Suggested Actions */}
                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.suggestedActions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleActionClick(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {message.role === 'assistant' && message.interactionId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Was this helpful?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(message.interactionId!, true)}
                    >
                      <ThumbsUpIcon className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(message.interactionId!, false)}
                    >
                      <ThumbsDownIcon className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {message.role === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                  <SparklesIcon className="w-4 h-4 animate-pulse" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t">
        <Input
          placeholder="Ask Sierra anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendMessageMutation.isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // TODO: Implement voice input
            console.log('Voice input')
          }}
        >
          <MicIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sendMessageMutation.isPending}
        >
          <SendIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Testing Checklist**:
- [ ] AI responses in <3 seconds (p95)
- [ ] Responses cite specific data (project names, numbers)
- [ ] Daily briefing highlights critical issues
- [ ] Suggested actions are contextually relevant
- [ ] Conversation history maintained across messages
- [ ] Feedback system works (thumbs up/down)
- [ ] Hallucination rate <1%
- [ ] Weather forecast integrated correctly
- [ ] Budget alerts detected and flagged
- [ ] Overdue tasks highlighted
- [ ] Voice input captures audio correctly
- [ ] Action buttons trigger correct flows

**Success Metrics**:
- 60% of users interact with AI weekly
- 4.5/5 average response rating
- <3 second response time (p95)
- >70% suggested actions clicked
- <1% hallucination rate

---

### 1.2 Critical Feature: Predictive Project Analytics

**Standard**: Predictions MUST be based on minimum 5 similar historical projects. Confidence score MUST be displayed. Prediction accuracy MUST be tracked and MUST exceed 75%. Predictions MUST update daily.

**Why It Matters**: Reactive management = crisis management. Predictive analytics = proactive problem-solving. Example: AI predicts Downtown Office will finish 3 days late (78% confidence) based on current burn rate and historical data. Project manager adjusts schedule NOW instead of discovering delay during final week.

**API Implementation**:
```typescript
// lib/ai/predictions.ts

import { createClient } from '@/lib/supabase/server'

interface PredictionParams {
  projectId: string
  predictionType: 'completion_date' | 'final_cost' | 'quality_score' | 'risk_level'
}

export async function generateProjectPrediction({
  projectId,
  predictionType,
}: PredictionParams) {
  const supabase = createClient()

  // Get current project data
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  // Get historical similar projects
  const { data: historicalProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', project.company_id)
    .eq('status', 'completed')
    .order('completion_date', { ascending: false })
    .limit(20)

  // Filter similar projects
  const similarProjects = historicalProjects?.filter(hp =>
    Math.abs(hp.estimated_budget - project.estimated_budget) < project.estimated_budget * 0.3 &&
    hp.project_type === project.project_type
  )

  if (!similarProjects || similarProjects.length < 5) {
    throw new Error('Insufficient historical data for prediction')
  }

  let prediction, confidence, factors

  switch (predictionType) {
    case 'completion_date':
      ({ prediction, confidence, factors } = predictCompletionDate(project, similarProjects))
      break
    case 'final_cost':
      ({ prediction, confidence, factors } = predictFinalCost(project, similarProjects))
      break
    case 'quality_score':
      ({ prediction, confidence, factors } = predictQualityScore(project, similarProjects))
      break
    case 'risk_level':
      ({ prediction, confidence, factors } = predictRiskLevel(project, similarProjects))
      break
  }

  // Save prediction
  const { data: savedPrediction } = await supabase
    .from('ai_predictions')
    .insert({
      project_id: projectId,
      company_id: project.company_id,
      prediction_type: predictionType,
      predicted_value: prediction,
      confidence_percentage: confidence,
      factors_considered: {
        historical_projects: similarProjects.length,
        current_progress: project.progress,
        budget_utilization: project.actual_cost / project.estimated_budget,
        ...factors,
      },
    })
    .select()
    .single()

  return savedPrediction
}

function predictCompletionDate(project: any, historical: any[]) {
  const avgDelayDays = historical.reduce((sum, p) => {
    const planned = new Date(p.target_completion)
    const actual = new Date(p.actual_completion || p.completion_date)
    return sum + (actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)
  }, 0) / historical.length

  const currentBurnRate = project.progress / daysSinceStart(project.start_date)
  const historicalBurnRate = historical.reduce((sum, p) =>
    sum + (100 / daysBetween(p.start_date, p.completion_date)), 0
  ) / historical.length

  const burnRateRatio = currentBurnRate / historicalBurnRate

  // Adjust delay based on burn rate
  const adjustedDelay = avgDelayDays * (2 - burnRateRatio) // Slower = more delay

  const targetDate = new Date(project.target_completion)
  const predictedDate = new Date(targetDate.getTime() + adjustedDelay * 24 * 60 * 60 * 1000)

  // Calculate confidence based on variance in historical data
  const delayVariance = calculateVariance(historical.map(p => {
    const planned = new Date(p.target_completion)
    const actual = new Date(p.actual_completion || p.completion_date)
    return (actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)
  }))

  const confidence = Math.max(50, Math.min(95, 90 - delayVariance * 2))

  return {
    prediction: {
      date: predictedDate.toISOString(),
      days_from_target: Math.round(adjustedDelay),
    },
    confidence: Math.round(confidence),
    factors: {
      avg_historical_delay_days: Math.round(avgDelayDays),
      current_burn_rate: currentBurnRate.toFixed(2),
      historical_burn_rate: historicalBurnRate.toFixed(2),
      burn_rate_ratio: burnRateRatio.toFixed(2),
    },
  }
}

function predictFinalCost(project: any, historical: any[]) {
  const avgCostOverrun = historical.reduce((sum, p) => {
    const overrun = ((p.actual_cost - p.estimated_budget) / p.estimated_budget) * 100
    return sum + overrun
  }, 0) / historical.length

  const currentUtilization = (project.actual_cost / project.estimated_budget) * 100
  const currentProgress = project.progress

  // If spending faster than progress, adjust prediction
  const utilizationToProgressRatio = currentUtilization / currentProgress

  const predictedOverrun = avgCostOverrun * utilizationToProgressRatio

  const predictedFinalCost = project.estimated_budget * (1 + predictedOverrun / 100)

  const variance = calculateVariance(historical.map(p =>
    ((p.actual_cost - p.estimated_budget) / p.estimated_budget) * 100
  ))

  const confidence = Math.max(50, Math.min(95, 85 - variance))

  return {
    prediction: {
      amount: Math.round(predictedFinalCost),
      overrun_percentage: predictedOverrun.toFixed(1),
      overrun_amount: Math.round(predictedFinalCost - project.estimated_budget),
    },
    confidence: Math.round(confidence),
    factors: {
      avg_historical_overrun: avgCostOverrun.toFixed(1) + '%',
      current_utilization: currentUtilization.toFixed(1) + '%',
      current_progress: currentProgress + '%',
      utilization_to_progress_ratio: utilizationToProgressRatio.toFixed(2),
    },
  }
}

function predictQualityScore(project: any, historical: any[]) {
  // Quality based on punch list items
  const avgPunchListItems = historical.reduce((sum, p) =>
    sum + (p.punch_list_items || 25), 0
  ) / historical.length

  // Adjust based on current issues
  const currentIssueRate = (project.open_issues || 0) / Math.max(1, project.progress)
  const historicalIssueRate = historical.reduce((sum, p) =>
    sum + ((p.punch_list_items || 25) / 100), 0
  ) / historical.length

  const issueRateRatio = currentIssueRate / historicalIssueRate

  const predictedPunchItems = Math.round(avgPunchListItems * issueRateRatio)

  // Quality score: 100 - (punch items * 2)
  const qualityScore = Math.max(0, Math.min(100, 100 - predictedPunchItems * 2))

  return {
    prediction: {
      score: qualityScore,
      predicted_punch_items: predictedPunchItems,
      rating: qualityScore >= 90 ? 'Excellent' : qualityScore >= 75 ? 'Good' : qualityScore >= 60 ? 'Fair' : 'Poor',
    },
    confidence: 75,
    factors: {
      avg_historical_punch_items: Math.round(avgPunchListItems),
      current_open_issues: project.open_issues || 0,
      issue_rate_ratio: issueRateRatio.toFixed(2),
    },
  }
}

function predictRiskLevel(project: any, historical: any[]) {
  const riskFactors = []
  let riskScore = 0

  // Budget risk
  const budgetUtilization = (project.actual_cost / project.estimated_budget) * 100
  if (budgetUtilization > project.progress + 15) {
    riskFactors.push({ factor: 'Budget overrun risk', severity: 'high', impact: 30 })
    riskScore += 30
  }

  // Schedule risk
  const plannedDuration = daysBetween(project.start_date, project.target_completion)
  const elapsed = daysSinceStart(project.start_date)
  const scheduleUtilization = (elapsed / plannedDuration) * 100
  if (scheduleUtilization > project.progress + 10) {
    riskFactors.push({ factor: 'Behind schedule', severity: 'medium', impact: 20 })
    riskScore += 20
  }

  // Team capacity risk
  if (project.team_size < 3) {
    riskFactors.push({ factor: 'Small team size', severity: 'low', impact: 10 })
    riskScore += 10
  }

  // Weather risk (if applicable)
  // TODO: Integrate weather API

  const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low'

  return {
    prediction: {
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: riskFactors,
    },
    confidence: 80,
    factors: {
      budget_utilization: budgetUtilization.toFixed(1) + '%',
      schedule_utilization: scheduleUtilization.toFixed(1) + '%',
      team_size: project.team_size,
    },
  }
}

function daysSinceStart(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length)
}
```

**Testing Checklist**:
- [ ] Predictions require minimum 5 similar projects
- [ ] Confidence scores between 50-95%
- [ ] Completion date predictions within ±3 days (80% accuracy)
- [ ] Cost predictions within ±5% (75% accuracy)
- [ ] Quality predictions based on historical punch lists
- [ ] Risk level calculated from multiple factors
- [ ] Predictions update daily automatically
- [ ] Actual outcomes tracked for accuracy measurement
- [ ] Low confidence predictions show warning

**Success Metrics**:
- Completion date prediction accuracy: >75%
- Cost prediction accuracy: >75%
- Quality score prediction accuracy: >70%
- Risk level prediction accuracy: >80%
- Average confidence score: >70%

---

## 2. USER EXPERIENCE QUALITY STANDARDS

- Loading states: Shimmer effect while AI thinks (max 3 seconds)
- Empty states: Suggest trying "What needs attention?" or "Show budget status"
- Error states: Specific error message ("AI unavailable, try again in 1 minute")
- Mobile: Full-screen chat interface on mobile, floating button to open
- Keyboard: Enter to send, Shift+Enter for new line, Esc to close
- Accessibility: Screen reader announces AI responses, high contrast mode

---

## 3. PERFORMANCE REQUIREMENTS

- AI response time: <3 seconds (p95)
- Daily briefing generation: <5 seconds
- Prediction calculation: <2 seconds
- Context gathering: <1 second
- Suggested actions: Display <500ms after response

---

## 4. SECURITY REQUIREMENTS

- Never log sensitive data (passwords, credit cards, SSNs)
- Sanitize AI responses for XSS attacks
- Rate limit: 50 messages per user per hour
- API key stored in environment variable (not code)
- User can delete their conversation history (GDPR)

---

## 5. PRE-LAUNCH CHECKLIST

- [ ] AI responses in <3 seconds
- [ ] Daily briefing highlights critical issues
- [ ] Predictions require 5+ historical projects
- [ ] Confidence scores displayed
- [ ] Feedback system working (thumbs up/down)
- [ ] Conversation history preserved
- [ ] Suggested actions clickable
- [ ] Voice input functional
- [ ] Export conversation to PDF

---

## 6. SUCCESS METRICS

- 60% weekly AI interaction rate
- 4.5/5 average response rating
- >70% suggested action click-through
- <1% hallucination rate
- >75% prediction accuracy

---

## 7. COMPETITIVE EDGE

**vs Procore**: No AI assistant
**vs Buildertrend**: Basic automation only
**Us**: Construction-specific AI with predictive analytics, voice commands, and automated documentation

**Win**: "Sierra AI saved me 30 minutes every morning by highlighting what needs attention."
