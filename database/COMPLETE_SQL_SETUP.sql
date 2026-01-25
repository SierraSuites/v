-- ============================================================
-- THE SIERRA SUITES - COMPLETE DATABASE SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================

-- STEP 1: Create all tables
-- ============================================================

-- 1. Projects Table
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

-- 2. Tasks Table
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

-- 3. Photos Table
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

-- 4. Activity Feed Table
create table activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- 5. Notifications Table
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

-- 6. User Profiles Table (extends auth.users)
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

-- 7. Team Members Table (for Pro/Enterprise)
create table team_members (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  member_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'member', 'viewer')) default 'member',
  status text check (status in ('active', 'inactive')) default 'active',
  invited_at timestamp with time zone default now(),
  joined_at timestamp with time zone
);

-- 8. Quotes Table (for QuoteHub)
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  client_name text not null,
  client_email text,
  title text not null,
  total_amount numeric not null,
  currency text default 'USD',
  status text check (status in ('draft', 'sent', 'accepted', 'rejected')) default 'draft',
  valid_until timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 9. Quote Items Table
create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id) on delete cascade not null,
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  total numeric generated always as (quantity * unit_price) stored,
  created_at timestamp with time zone default now()
);

-- 10. Reports Table
create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade,
  type text not null,
  title text not null,
  data jsonb,
  created_at timestamp with time zone default now()
);

-- 11. CRM Contacts Table (Pro/Enterprise)
create table crm_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company text,
  role text,
  status text check (status in ('lead', 'prospect', 'client', 'inactive')) default 'lead',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 12. AI Interactions Table (Enterprise)
create table ai_interactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  prompt text not null,
  response text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);


-- STEP 2: Create Indexes for Performance
-- ============================================================

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

-- Activities indexes
create index idx_activities_user_id on activities(user_id);
create index idx_activities_created_at on activities(created_at desc);

-- Notifications indexes
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read on notifications(read);
create index idx_notifications_created_at on notifications(created_at desc);

-- User profiles indexes
create index idx_user_profiles_plan on user_profiles(plan);
create index idx_user_profiles_stripe_customer_id on user_profiles(stripe_customer_id);

-- Team members indexes
create index idx_team_members_owner_id on team_members(owner_id);
create index idx_team_members_member_id on team_members(member_id);

-- Quotes indexes
create index idx_quotes_user_id on quotes(user_id);
create index idx_quotes_project_id on quotes(project_id);
create index idx_quotes_status on quotes(status);

-- CRM contacts indexes
create index idx_crm_contacts_user_id on crm_contacts(user_id);
create index idx_crm_contacts_status on crm_contacts(status);


-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================

alter table projects enable row level security;
alter table tasks enable row level security;
alter table photos enable row level security;
alter table activities enable row level security;
alter table notifications enable row level security;
alter table user_profiles enable row level security;
alter table team_members enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table reports enable row level security;
alter table crm_contacts enable row level security;
alter table ai_interactions enable row level security;


-- STEP 4: Create RLS Policies
-- ============================================================

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

-- Team Members Policies
create policy "Owners can view their team"
  on team_members for select
  using (auth.uid() = owner_id);

create policy "Owners can manage their team"
  on team_members for all
  using (auth.uid() = owner_id);

-- Quotes Policies
create policy "Users can view own quotes"
  on quotes for select
  using (auth.uid() = user_id);

create policy "Users can create own quotes"
  on quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quotes"
  on quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete own quotes"
  on quotes for delete
  using (auth.uid() = user_id);

-- Quote Items Policies
create policy "Users can view quote items for their quotes"
  on quote_items for select
  using (
    exists (
      select 1 from quotes
      where quotes.id = quote_items.quote_id
      and quotes.user_id = auth.uid()
    )
  );

create policy "Users can manage quote items for their quotes"
  on quote_items for all
  using (
    exists (
      select 1 from quotes
      where quotes.id = quote_items.quote_id
      and quotes.user_id = auth.uid()
    )
  );

-- Reports Policies
create policy "Users can view own reports"
  on reports for select
  using (auth.uid() = user_id);

create policy "Users can create own reports"
  on reports for insert
  with check (auth.uid() = user_id);

-- CRM Contacts Policies
create policy "Users can view own contacts"
  on crm_contacts for select
  using (auth.uid() = user_id);

create policy "Users can manage own contacts"
  on crm_contacts for all
  using (auth.uid() = user_id);

-- AI Interactions Policies
create policy "Users can view own AI interactions"
  on ai_interactions for select
  using (auth.uid() = user_id);

create policy "Users can create own AI interactions"
  on ai_interactions for insert
  with check (auth.uid() = user_id);


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

-- Apply to all tables with updated_at
create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

create trigger update_tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_quotes_updated_at
  before update on quotes
  for each row execute function update_updated_at_column();

create trigger update_crm_contacts_updated_at
  before update on crm_contacts
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

-- Run these in Supabase Storage UI or SQL:
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);


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

-- Documents bucket policies
create policy "Users can manage own documents"
  on storage.objects for all
  using (
    bucket_id = 'documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

-- Next steps:
-- 1. Run this entire file in Supabase SQL Editor
-- 2. Go to Storage settings and enable the buckets
-- 3. Test by registering a new user - profile should auto-create
-- 4. Your dashboard will now show real data!

-- Verification queries (run these to check everything worked):
-- SELECT * FROM user_profiles LIMIT 1;
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM storage.buckets;
