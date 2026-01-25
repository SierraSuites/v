-- ============================================================
-- THE SIERRA SUITES - ESSENTIAL DATABASE SETUP
-- Only includes tables for EXISTING pages (Dashboard only)
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================

-- STEP 1: Create Essential Tables
-- ============================================================

-- 1. User Profiles Table (extends auth.users)
-- Needed for: Dashboard to show user name, company, tier
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  country text,
  phone text,
  avatar_url text,
  plan text check (plan in ('starter', 'professional', 'enterprise')) default 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Projects Table
-- Needed for: Dashboard stats (total projects, active, completed)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  client text,
  status text check (status in ('active', 'on-hold', 'completed')) default 'active',
  budget numeric,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  due_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Tasks Table
-- Needed for: Dashboard stats (tasks today, overdue, this week, completion rate)
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  status text check (status in ('pending', 'in-progress', 'completed')) default 'pending',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Photos Table
-- Needed for: Dashboard stats (recent photos count, storage used)
create table photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  caption text,
  size_bytes bigint not null,
  width integer,
  height integer,
  created_at timestamp with time zone default now()
);

-- 5. Activities Table
-- Needed for: Dashboard activity feed
create table activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 6. Notifications Table
-- Needed for: Dashboard notification bell dropdown
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('info', 'success', 'warning', 'error')) default 'info',
  title text not null,
  message text not null,
  read boolean default false,
  action_url text,
  created_at timestamp with time zone default now()
);


-- STEP 2: Create Indexes for Performance
-- ============================================================

-- User profiles indexes
create index idx_user_profiles_plan on user_profiles(plan);

-- Projects indexes
create index idx_projects_user_id on projects(user_id);
create index idx_projects_status on projects(status);
create index idx_projects_due_date on projects(due_date);

-- Tasks indexes
create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_project_id on tasks(project_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_due_date on tasks(due_date);

-- Photos indexes
create index idx_photos_user_id on photos(user_id);
create index idx_photos_project_id on photos(project_id);
create index idx_photos_created_at on photos(created_at desc);

-- Activities indexes
create index idx_activities_user_id on activities(user_id);
create index idx_activities_created_at on activities(created_at desc);

-- Notifications indexes
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read on notifications(read);
create index idx_notifications_created_at on notifications(created_at desc);


-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================

alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table photos enable row level security;
alter table activities enable row level security;
alter table notifications enable row level security;


-- STEP 4: Create RLS Policies
-- ============================================================

-- User Profiles Policies
create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

-- Projects Policies
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Tasks Policies
create policy "Users can view own tasks"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Users can create own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- Photos Policies
create policy "Users can view own photos"
  on photos for select
  using (auth.uid() = user_id);

create policy "Users can upload own photos"
  on photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own photos"
  on photos for delete
  using (auth.uid() = user_id);

-- Activities Policies
create policy "Users can view own activities"
  on activities for select
  using (auth.uid() = user_id);

create policy "Users can create own activities"
  on activities for insert
  with check (auth.uid() = user_id);

-- Notifications Policies
create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);


-- STEP 5: Create Functions for Auto-Updates
-- ============================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at
create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

create trigger update_tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();


-- STEP 6: Create Function to Auto-Create User Profile
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, plan)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'starter'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- STEP 7: Create Storage Buckets
-- ============================================================

-- Photos bucket for FieldSnap (when built)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false);

-- Avatars bucket for user profile pictures
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);


-- STEP 8: Storage Policies
-- ============================================================

-- Photos bucket policies
create policy "Users can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own photos"
  on storage.objects for select
  using (
    bucket_id = 'photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Avatars bucket policies (public read)
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

-- What this gives you:
-- ✅ User profiles (auto-created on signup)
-- ✅ Projects tracking (for dashboard stats)
-- ✅ Tasks tracking (for dashboard stats)
-- ✅ Photos metadata (for dashboard stats)
-- ✅ Activity feed (for dashboard timeline)
-- ✅ Notifications (for dashboard bell)
-- ✅ Storage buckets (photos, avatars)
-- ✅ All security policies (RLS)

-- Next steps:
-- 1. Run this entire file in Supabase SQL Editor
-- 2. Register a new user - profile will auto-create with "starter" plan
-- 3. Your dashboard will now show real data (currently all 0s)
-- 4. As you build new pages, add their tables later

-- Verification queries (run these to check):
-- SELECT * FROM user_profiles LIMIT 1;
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM storage.buckets;
