# TaskFlow Complete Implementation Plan

## 📋 Implementation Status Overview

### ✅ COMPLETED FEATURES
1. **UI/UX Design System** - Full "Coral Clarity" applied
2. **Dashboard View Structure** - Stats grid, task cards, basic layout
3. **Kanban View Structure** - Column layout with cards
4. **List View Structure** - Table with all columns
5. **Sidebar Navigation** - Collapsible with all nav items
6. **Tier-Based Gating** - Upgrade prompts for Pro+ features
7. **Trade Color Coding** - All 7 trades with proper colors
8. **Priority & Status Indicators** - Visual badges and icons
9. **Responsive Layout** - Mobile-ready grid systems
10. **Filter System** - Project, Trade, Priority filters

---

## 🚧 FEATURES TO IMPLEMENT

### 1. DASHBOARD WIDGETS (Missing)

#### A. Team Allocation Heatmap
**Purpose**: Show which team members are working when
**Implementation**:
- Grid: Team members (rows) × Days of week (columns)
- Color intensity based on task load (light → heavy)
- Red highlights for over-allocation
- Drag handles for quick reassignment
- Real-time updates when tasks are assigned

**Data Structure**:
```typescript
type TeamMember = {
  id: string
  name: string
  avatar: string
  role: string
  workloadByDay: {
    monday: number    // hours allocated
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
    saturday: number
    sunday: number
  }
  maxHoursPerDay: number  // typically 8
}
```

**Visual Design**:
- Each cell shows hours allocated
- Background color intensity:
  - 0-4 hours: light green (#E6F9EA)
  - 4-6 hours: medium green (#6BCB77)
  - 6-8 hours: yellow (#FFD93D)
  - 8+ hours: red (#DC2626) - over-allocated!

---

#### B. Progress & Metrics Widget
**Purpose**: Show team performance trends
**Implementation**:
- Weekly completion rate trend line chart
- Quality score (based on rework tasks) - circular gauge
- Safety compliance percentage - progress bar
- Budget adherence (planned vs actual hours) - comparison chart

**Charts to Build**:
1. **Completion Rate Line Chart**: Last 4 weeks
2. **Quality Score Gauge**: 0-100% circular
3. **Safety Compliance Bar**: Visual progress bar
4. **Budget Adherence**: Actual vs Estimated hours comparison

---

### 2. TASK CREATION MODAL (Incomplete)

**Current**: Shows "coming soon" placeholder
**Needed**: Full form with all construction-specific fields

**Form Sections**:

#### A. Basic Information
- Task Title (text input with auto-suggestions)
- Rich Description (textarea with markdown support)
- Project Association (dropdown - required)
- Construction Phase (dropdown): Pre-construction, Foundation, Framing, MEP, Finishing, Closeout
- Trade Type (dropdown): Electrical, Plumbing, HVAC, Concrete, Framing, Finishing, General

#### B. Scheduling Intelligence
- Start Date (date picker with construction calendar - excludes weekends/holidays)
- Duration in construction days (number input - 8-hour units)
- Due Date (auto-calculated: start date + duration)
- Dependencies (multi-select dropdown of other tasks)
- Float Time (auto-calculated based on dependencies)
- Weather Contingency Buffer (checkbox + days input)

#### C. Resource Management
- Primary Assignee (user dropdown)
- Crew Size Requirement (number input)
- Equipment Needs (multi-select): Crane, Excavator, Concrete Pump, Scaffolding, etc.
- Material Requirements (textarea with quantity tracking)
- Skill Certifications Required (multi-select): Licensed Electrician, Certified Welder, OSHA 30, etc.

#### D. Quality & Safety
- Inspection Requirements (checkboxes): Pre-task, During, Post-completion
- Safety Protocols (multi-select): Fall Protection, Confined Space, Hot Work, Trenching, etc.
- Quality Standards (textarea): Tolerance levels, Finish quality specs
- Documentation Requirements (checkboxes): Photos, Sign-offs, Certificates

#### E. Advanced Options
- Priority Level (dropdown): Critical, High, Medium, Low
- Weather Dependent (checkbox)
- Notify Inspector (checkbox with date picker)
- Client Visibility (checkbox)

**Validation Rules**:
- Task title required
- Project required
- Start date cannot be in the past
- Duration must be positive
- Assignee required
- If inspection required, must specify when
- If weather dependent, must add contingency buffer

---

### 3. DRAG-AND-DROP KANBAN (Non-functional)

**Current**: Static cards that don't move
**Needed**: Full drag-and-drop with state updates

**Library**: Use `@dnd-kit/core` for drag-drop

**Features to Implement**:
1. **Draggable Cards**: Click and hold to drag
2. **Droppable Columns**: Highlight on drag-over
3. **Magnetic Snapping**: Cards snap into position
4. **Optimistic Updates**: UI updates immediately
5. **Undo Functionality**: Ctrl+Z to undo last move
6. **Haptic Feedback**: Vibrate on mobile when dropped
7. **Visual Feedback**: Card opacity changes during drag

**State Management**:
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event

  if (!over) return

  // Find task being dragged
  const taskId = active.id
  const newStatus = over.id as TaskStatus

  // Optimistic update
  setTasks(prev => prev.map(task =>
    task.id === taskId
      ? { ...task, status: newStatus }
      : task
  ))

  // Persist to database
  updateTaskStatus(taskId, newStatus)

  // Show success toast
  showToast(`Task moved to ${newStatus}`, "success")
}
```

---

### 4. CALENDAR VIEW (Placeholder only)

**Current**: Shows upgrade prompt or "coming soon"
**Needed**: Full construction calendar with:

**Calendar Features**:
1. **Multiple Views**: Day, Week, Month
2. **Color-Coded Tasks**: By trade or priority
3. **Drag-to-Reschedule**: Drag tasks to new dates
4. **Weather Overlay**: Show weather forecast icons
5. **Inspection Markers**: Special icons for inspection days
6. **Resource Conflicts**: Highlight scheduling conflicts
7. **Critical Path**: Red border for critical path items

**Calendar Layers** (toggleable):
- Master Schedule (milestones)
- Trade Coordination (filtered by trade)
- Resource Calendar (equipment, materials)
- Weather Forecast (7-day outlook)
- Inspection Schedule (planned inspections)

**Library**: Use `react-big-calendar` or `FullCalendar`

---

### 5. GANTT CHART VIEW (Placeholder only)

**Current**: Shows upgrade prompt or "coming soon"
**Needed**: Interactive Gantt chart

**Gantt Features**:
1. **Timeline Bar Chart**: Visual task timeline
2. **Dependency Lines**: Visual arrows between dependent tasks
3. **Critical Path Highlighting**: Red tasks on critical path
4. **Drag to Reschedule**: Drag bars to change dates
5. **Drag to Extend**: Drag bar ends to change duration
6. **Baseline Comparison**: Show original vs actual timeline
7. **Zoom Levels**: Year, Quarter, Month, Week, Day views
8. **Resource Allocation**: Show who's assigned to each task
9. **Progress Indicators**: Shaded portion shows completion %
10. **Milestone Markers**: Diamond shapes for key milestones

**Library**: Use `@bryntum/gantt` or `frappe-gantt`

**Data Structure**:
```typescript
type GanttTask = {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  dependencies: string[]  // IDs of predecessor tasks
  assignee: string
  trade: string
  isCriticalPath: boolean
}
```

---

### 6. WEATHER INTEGRATION (Icons only, no data)

**Current**: Shows weather icons but no real data
**Needed**: Live weather API integration

**API**: OpenWeatherMap or WeatherAPI

**Features**:
1. **7-Day Forecast**: Show upcoming weather
2. **Weather Alerts**: Notify for rain, extreme heat/cold
3. **Auto-Rescheduling**: Suggest rescheduling outdoor tasks for rain
4. **Temperature Monitoring**: Alert for concrete pouring temperature limits
5. **Wind Speed Alerts**: For crane operations
6. **Precipitation Tracking**: For outdoor work

**Implementation**:
```typescript
const fetchWeather = async (location: string) => {
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${API_KEY}`
  )
  const data = await response.json()
  return data
}

// Check for weather impacts
const checkWeatherImpacts = (task: Task, forecast: WeatherData) => {
  if (!task.weatherDependent) return null

  const taskDate = new Date(task.dueDate)
  const weather = forecast.find(f => isSameDay(f.date, taskDate))

  if (weather.precipitation > 0.5) {
    return {
      type: "warning",
      message: `Rain expected on ${task.dueDate}. Consider rescheduling.`,
      suggestedDate: findNextClearDay(taskDate, forecast)
    }
  }

  return null
}
```

---

### 7. REAL-TIME UPDATES (Not implemented)

**Current**: Static data, no live updates
**Needed**: Real-time collaboration

**Technology**: Supabase Realtime or WebSocket

**Features**:
1. **Live Task Updates**: See changes as others make them
2. **User Presence**: Show who's viewing/editing
3. **Collaborative Cursors**: See where team members are clicking
4. **Optimistic UI**: Instant feedback, sync in background
5. **Conflict Resolution**: Handle simultaneous edits
6. **Activity Feed**: Live stream of all changes

**Implementation**:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Subscribe to task changes
useEffect(() => {
  const channel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [...prev, payload.new as Task])
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t =>
            t.id === payload.new.id ? payload.new as Task : t
          ))
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

---

### 8. OFFLINE SUPPORT (Not implemented)

**Current**: Requires internet connection
**Needed**: Offline-first architecture

**Technology**: Service Worker + IndexedDB

**Features**:
1. **Offline Task Viewing**: See cached tasks offline
2. **Offline Task Creation**: Create tasks, sync when online
3. **Queue System**: Queue actions, execute when connected
4. **Sync Indicator**: Show sync status in UI
5. **Conflict Resolution**: Handle offline edits when syncing
6. **Background Sync**: Auto-sync when connection restored

**Implementation**:
```typescript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Offline detection
const [isOnline, setIsOnline] = useState(navigator.onLine)

useEffect(() => {
  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])

// Save to IndexedDB when offline
const saveTaskOffline = async (task: Task) => {
  const db = await openDB('taskflow-offline', 1)
  await db.put('pendingTasks', task)
}

// Sync when back online
const syncOfflineTasks = async () => {
  const db = await openDB('taskflow-offline', 1)
  const pendingTasks = await db.getAll('pendingTasks')

  for (const task of pendingTasks) {
    await supabase.from('tasks').upsert(task)
    await db.delete('pendingTasks', task.id)
  }
}
```

---

### 9. NOTIFICATION SYSTEM (Not implemented)

**Current**: No notifications
**Needed**: Full notification system

**Notification Types**:
1. **Task Due Soon**: 24 hours before due date
2. **Task Overdue**: When task passes due date
3. **Task Assigned**: When you're assigned a new task
4. **Task Completed**: When someone completes your task
5. **Dependency Ready**: When blocking task is completed
6. **Weather Alert**: Rain/extreme weather for outdoor tasks
7. **Inspection Reminder**: 24 hours before inspection
8. **Resource Conflict**: When equipment double-booked
9. **Team Mention**: When someone @mentions you
10. **Daily Summary**: Morning digest of today's tasks

**Delivery Channels**:
- In-app notifications (bell icon)
- Browser push notifications
- Email notifications (optional)
- SMS notifications (Pro+)

**Implementation**:
```typescript
type Notification = {
  id: string
  type: 'task-due' | 'task-overdue' | 'task-assigned' | 'weather-alert' | 'inspection' | 'mention'
  title: string
  message: string
  actionUrl: string
  read: boolean
  createdAt: Date
}

const [notifications, setNotifications] = useState<Notification[]>([])
const [unreadCount, setUnreadCount] = useState(0)

// Fetch notifications
useEffect(() => {
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications(data || [])
    setUnreadCount(data?.filter(n => !n.read).length || 0)
  }

  fetchNotifications()
}, [user])

// Browser push notifications
const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    // Subscribe to push notifications
    const registration = await navigator.serviceWorker.ready
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    })
  }
}
```

---

### 10. SUPABASE DATABASE INTEGRATION (Not implemented)

**Current**: Using local state only
**Needed**: Full database persistence

**Database Schema**:

```sql
-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  trade TEXT NOT NULL,
  phase TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  due_date DATE NOT NULL,
  start_date DATE,
  duration_days INTEGER,
  progress INTEGER DEFAULT 0,
  estimated_hours DECIMAL,
  actual_hours DECIMAL DEFAULT 0,
  location TEXT,
  weather_dependent BOOLEAN DEFAULT FALSE,
  inspection_required BOOLEAN DEFAULT FALSE,
  dependencies JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see tasks from their company
CREATE POLICY "Company users can view tasks" ON tasks
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Users can only create tasks in their company
CREATE POLICY "Company users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Users can only update tasks they're assigned to or they're a manager
CREATE POLICY "Assigned users or managers can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'superintendent')
    )
  );

-- Trade-based visibility (electricians only see electrical tasks)
CREATE POLICY "Trade-based task access" ON tasks
  FOR SELECT USING (
    trade = ANY(
      SELECT unnest(user_trades) FROM profiles
      WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superintendent')
    )
  );
```

**CRUD Operations**:
```typescript
// Create task
const createTask = async (task: Partial<Task>) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single()

  if (error) throw error
  return data
}

// Read tasks
const fetchTasks = async (filters?: TaskFilters) => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(name),
      assignee:profiles(full_name, avatar_url)
    `)
    .order('due_date', { ascending: true })

  if (filters?.project) {
    query = query.eq('project_id', filters.project)
  }

  if (filters?.trade) {
    query = query.eq('trade', filters.trade)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// Update task
const updateTask = async (id: string, updates: Partial<Task>) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete task
const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

---

### 11. SMART AUTOMATIONS (Not implemented)

**Current**: Manual task management only
**Needed**: Intelligent automation

**Automation Rules**:

#### A. Weather-Based Rescheduling
```typescript
// Check weather daily and auto-reschedule outdoor tasks
const weatherAutomation = async () => {
  const outdoorTasks = await fetchTasks({ weatherDependent: true })
  const forecast = await fetchWeather(companyLocation)

  for (const task of outdoorTasks) {
    const taskWeather = getWeatherForDate(forecast, task.dueDate)

    if (taskWeather.precipitation > 0.5 || taskWeather.windSpeed > 25) {
      const nextClearDay = findNextClearDay(task.dueDate, forecast)

      // Notify user and suggest reschedule
      await createNotification({
        type: 'weather-alert',
        title: 'Weather Impact Alert',
        message: `Task "${task.title}" may be affected by weather. Suggest rescheduling to ${nextClearDay}`,
        actionUrl: `/taskflow?task=${task.id}`
      })

      // Auto-reschedule if enabled
      if (task.autoRescheduleEnabled) {
        await updateTask(task.id, { dueDate: nextClearDay })
      }
    }
  }
}
```

#### B. Dependency Chain Activation
```typescript
// When a task is completed, activate successor tasks
const dependencyAutomation = async (completedTaskId: string) => {
  // Find all tasks that depend on this one
  const { data: dependentTasks } = await supabase
    .from('tasks')
    .select('*')
    .contains('dependencies', [completedTaskId])

  for (const task of dependentTasks || []) {
    // Check if all dependencies are complete
    const allDepsComplete = await checkAllDependenciesComplete(task.dependencies)

    if (allDepsComplete && task.status === 'not-started') {
      // Auto-activate task
      await updateTask(task.id, { status: 'in-progress' })

      // Notify assignee
      await createNotification({
        type: 'dependency-ready',
        title: 'Task Ready to Start',
        message: `Task "${task.title}" is now unblocked and ready to begin`,
        userId: task.assigneeId,
        actionUrl: `/taskflow?task=${task.id}`
      })
    }
  }
}
```

#### C. Inspection Scheduling
```typescript
// Auto-create inspection tasks when needed
const inspectionAutomation = async (taskId: string) => {
  const task = await fetchTask(taskId)

  if (task.inspectionRequired) {
    // Create inspection task
    const inspectionTask = await createTask({
      title: `Inspection: ${task.title}`,
      description: `Required inspection for ${task.title}`,
      projectId: task.projectId,
      trade: 'general',
      phase: task.phase,
      priority: 'high',
      status: 'not-started',
      assigneeId: inspectorId,
      dueDate: addDays(task.dueDate, 1),
      inspectionRequired: false,
      dependencies: [taskId]
    })

    // Notify inspector
    await createNotification({
      type: 'inspection',
      title: 'Inspection Required',
      message: `Inspection needed for "${task.title}" on ${inspectionTask.dueDate}`,
      userId: inspectorId,
      actionUrl: `/taskflow?task=${inspectionTask.id}`
    })
  }
}
```

#### D. Critical Path Recalculation
```typescript
// Recalculate critical path when tasks are delayed
const criticalPathAutomation = async (projectId: string) => {
  const projectTasks = await fetchTasks({ project: projectId })

  // Build dependency graph
  const graph = buildDependencyGraph(projectTasks)

  // Calculate critical path using longest path algorithm
  const criticalPath = calculateCriticalPath(graph)

  // Update tasks on critical path
  for (const task of projectTasks) {
    const isCritical = criticalPath.includes(task.id)
    await updateTask(task.id, { isCriticalPath: isCritical })
  }

  // Notify project manager of critical tasks
  if (criticalPath.length > 0) {
    await createNotification({
      type: 'critical-path-update',
      title: 'Critical Path Updated',
      message: `${criticalPath.length} tasks are now on the critical path`,
      userId: projectManagerId,
      actionUrl: `/projects/${projectId}/gantt`
    })
  }
}
```

---

### 12. ANALYTICS TRACKING (Not implemented)

**Current**: No analytics
**Needed**: Comprehensive tracking

**Metrics to Track**:
1. **Task Completion Rate**: % of tasks completed on time
2. **Average Task Duration**: Actual vs estimated
3. **Team Productivity**: Tasks completed per team member
4. **Trade Performance**: Completion rate by trade
5. **Project Health**: Overall project progress
6. **Delay Patterns**: Common causes of delays
7. **Quality Metrics**: Rework rate, inspection pass rate
8. **Resource Utilization**: Equipment and crew usage

**Implementation**:
```typescript
// Track task completion
const trackTaskCompletion = async (task: Task) => {
  await analytics.track('Task Completed', {
    taskId: task.id,
    project: task.project,
    trade: task.trade,
    priority: task.priority,
    daysToComplete: differenceInDays(new Date(), new Date(task.startDate)),
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    onTime: new Date() <= new Date(task.dueDate)
  })
}

// Track view changes
const trackViewChange = (view: string) => {
  analytics.track('View Changed', {
    view,
    timestamp: new Date()
  })
}

// Track task creation
const trackTaskCreation = (task: Task) => {
  analytics.track('Task Created', {
    trade: task.trade,
    priority: task.priority,
    weatherDependent: task.weatherDependent,
    inspectionRequired: task.inspectionRequired
  })
}
```

---

### 13. ERROR BOUNDARIES (Not implemented)

**Current**: Errors crash entire app
**Needed**: Graceful error handling

**Create**: `components/ErrorBoundary.tsx` (see separate file)

**Usage**:
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <TaskFlowPage />
</ErrorBoundary>
```

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Critical Features (Week 1)
1. ✅ Task Creation Modal (complete form)
2. ✅ Supabase Database Integration
3. ✅ CRUD Operations for tasks
4. ✅ Real-time updates

### Phase 2: Enhanced UX (Week 2)
5. ✅ Drag-and-drop Kanban
6. ✅ Team Allocation Heatmap
7. ✅ Progress & Metrics Widget
8. ✅ Notification System

### Phase 3: Advanced Features (Week 3)
9. ✅ Calendar View
10. ✅ Gantt Chart View
11. ✅ Weather Integration
12. ✅ Smart Automations

### Phase 4: Polish & Optimization (Week 4)
13. ✅ Offline Support
14. ✅ Error Boundaries
15. ✅ Analytics Tracking
16. ✅ Performance Optimization

---

## 📝 NEXT STEPS

1. Start with Task Creation Modal (highest user impact)
2. Implement Supabase integration (enables all other features)
3. Add Team Heatmap & Metrics widgets (complete dashboard)
4. Build Calendar View (Pro+ feature)
5. Build Gantt Chart (Pro+ feature)
6. Add drag-and-drop to Kanban
7. Integrate Weather API
8. Implement notifications
9. Add offline support
10. Set up error boundaries
11. Add analytics tracking
12. Implement smart automations

---

This document serves as the complete roadmap for TaskFlow implementation.
