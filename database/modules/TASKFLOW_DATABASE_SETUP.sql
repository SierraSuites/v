-- ============================================================
-- THE SIERRA SUITES - TASKFLOW DATABASE SETUP
-- Enhanced tasks table with construction-specific fields
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- Drop existing tasks table if you want to start fresh (CAUTION: This deletes all data)
-- Uncomment the next line only if you're okay with losing existing task data
-- drop table if exists tasks cascade;

-- Create or replace the tasks table with all construction-specific fields
create table if not exists tasks (
  -- Core identification
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Basic information
  title text not null,
  description text,
  project_id uuid references projects(id) on delete cascade,
  project_name text,

  -- Construction categorization
  trade text check (trade in ('electrical', 'plumbing', 'hvac', 'concrete', 'framing', 'finishing', 'general')) default 'general',
  phase text check (phase in ('pre-construction', 'foundation', 'framing', 'mep', 'finishing', 'closeout')) default 'pre-construction',

  -- Status and priority
  status text check (status in ('not-started', 'in-progress', 'review', 'completed', 'blocked')) default 'not-started',
  priority text check (priority in ('critical', 'high', 'medium', 'low')) default 'medium',

  -- Assignment
  assignee_id uuid references auth.users(id) on delete set null,
  assignee_name text,
  assignee_avatar text,

  -- Scheduling
  start_date date,
  due_date date not null,
  duration integer default 1, -- in days
  progress integer default 0 check (progress >= 0 and progress <= 100),

  -- Time tracking
  estimated_hours numeric default 8,
  actual_hours numeric default 0,

  -- Dependencies and relationships
  dependencies text[] default '{}', -- array of task IDs

  -- Metadata
  attachments integer default 0,
  comments integer default 0,
  location text,

  -- Weather considerations
  weather_dependent boolean default false,
  weather_buffer integer default 0, -- buffer days for weather delays

  -- Inspection requirements
  inspection_required boolean default false,
  inspection_type text,

  -- Resource management
  crew_size integer default 1,
  equipment text[] default '{}', -- array of equipment names
  materials text[] default '{}', -- array of material names
  certifications text[] default '{}', -- required certifications

  -- Safety and quality
  safety_protocols text[] default '{}',
  quality_standards text[] default '{}',
  documentation text[] default '{}', -- required documentation

  -- Advanced settings
  notify_inspector boolean default false,
  client_visibility boolean default false,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Create indexes for better query performance
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_assignee_id on tasks(assignee_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_priority on tasks(priority);
create index if not exists idx_tasks_trade on tasks(trade);
create index if not exists idx_tasks_phase on tasks(phase);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_weather_dependent on tasks(weather_dependent);
create index if not exists idx_tasks_inspection_required on tasks(inspection_required);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on tasks table
alter table tasks enable row level security;

-- Policy: Users can view their own tasks
create policy "Users can view their own tasks"
  on tasks for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own tasks
create policy "Users can insert their own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own tasks
create policy "Users can update their own tasks"
  on tasks for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own tasks
create policy "Users can delete their own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- Policy: Assigned users can view tasks assigned to them
create policy "Assigned users can view their assigned tasks"
  on tasks for select
  using (auth.uid() = assignee_id);

-- Policy: Assigned users can update tasks assigned to them (for progress updates)
create policy "Assigned users can update their assigned tasks"
  on tasks for update
  using (auth.uid() = assignee_id);

-- ============================================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ============================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for tasks table
drop trigger if exists update_tasks_updated_at on tasks;
create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at_column();

-- ============================================================
-- AUTOMATIC COMPLETED_AT UPDATE TRIGGER
-- ============================================================

-- Function to set completed_at when status changes to completed
create or replace function set_completed_at()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    new.completed_at = now();
    new.progress = 100;
  elsif new.status != 'completed' and old.status = 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for automatic completed_at
drop trigger if exists set_task_completed_at on tasks;
create trigger set_task_completed_at
  before update on tasks
  for each row
  execute function set_completed_at();

-- ============================================================
-- TEAM MEMBERS TABLE (if not exists)
-- For storing team member information for task assignment
-- ============================================================

create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  avatar text,
  role text,
  trades text[] default '{}', -- trades this member can work on
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table team_members enable row level security;

-- Policy: Users can view their own team members
create policy "Users can view their own team members"
  on team_members for select
  using (auth.uid() = user_id);

-- Policy: Users can manage their own team members
create policy "Users can insert their own team members"
  on team_members for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own team members"
  on team_members for update
  using (auth.uid() = user_id);

create policy "Users can delete their own team members"
  on team_members for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TASK COMMENTS TABLE (for future use)
-- ============================================================

create table if not exists task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  comment text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table task_comments enable row level security;

-- Policy: Users can view comments on their tasks
create policy "Users can view comments on their tasks"
  on task_comments for select
  using (
    exists (
      select 1 from tasks
      where tasks.id = task_comments.task_id
      and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid())
    )
  );

-- Policy: Users can add comments to their tasks
create policy "Users can add comments to their tasks"
  on task_comments for insert
  with check (
    exists (
      select 1 from tasks
      where tasks.id = task_comments.task_id
      and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid())
    )
  );

-- ============================================================
-- TASK ATTACHMENTS TABLE (for future use)
-- ============================================================

create table if not exists task_attachments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  file_type text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table task_attachments enable row level security;

-- Policy: Users can view attachments on their tasks
create policy "Users can view attachments on their tasks"
  on task_attachments for select
  using (
    exists (
      select 1 from tasks
      where tasks.id = task_attachments.task_id
      and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid())
    )
  );

-- Policy: Users can add attachments to their tasks
create policy "Users can add attachments to their tasks"
  on task_attachments for insert
  with check (
    exists (
      select 1 from tasks
      where tasks.id = task_attachments.task_id
      and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid())
    )
  );

-- ============================================================
-- REALTIME PUBLICATION (Enable real-time updates)
-- ============================================================

-- Enable realtime for tasks table
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_comments;
alter publication supabase_realtime add table task_attachments;

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- Uncomment to insert sample data
-- ============================================================

-- Insert sample team members
-- insert into team_members (user_id, name, role, trades) values
--   (auth.uid(), 'Mike Johnson', 'Electrician', array['electrical']),
--   (auth.uid(), 'Sarah Wilson', 'HVAC Technician', array['hvac']),
--   (auth.uid(), 'Tom Brown', 'Finishing Specialist', array['finishing']);

-- ============================================================
-- COMPLETED!
-- Your TaskFlow database is now set up and ready to use.
-- ============================================================
