-- Sprout Database Schema
-- Run this in your Supabase SQL editor

-- 1. Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Profiles are publicly viewable" on profiles;
create policy "Profiles are publicly viewable"
  on profiles for select using (true);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- 2. Skills (master list)
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text
);

alter table skills enable row level security;

drop policy if exists "Skills are publicly viewable" on skills;
create policy "Skills are publicly viewable"
  on skills for select using (true);

drop policy if exists "Authenticated users can insert skills" on skills;
create policy "Authenticated users can insert skills"
  on skills for insert with check (auth.role() = 'authenticated');

-- 3. User skills
create table if not exists user_skills (
  user_id uuid references profiles(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  proficiency text default 'intermediate',
  primary key (user_id, skill_id)
);

alter table user_skills enable row level security;

drop policy if exists "User skills are publicly viewable" on user_skills;
create policy "User skills are publicly viewable"
  on user_skills for select using (true);

drop policy if exists "Users can manage their own skills" on user_skills;
create policy "Users can manage their own skills"
  on user_skills for all using (auth.uid() = user_id);

-- 4. Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  title text not null,
  tagline text,
  description text not null,
  status text default 'seed',
  cover_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;

drop policy if exists "Projects are publicly viewable" on projects;
create policy "Projects are publicly viewable"
  on projects for select using (true);

drop policy if exists "Authenticated users can insert projects" on projects;
create policy "Authenticated users can insert projects"
  on projects for insert with check (auth.role() = 'authenticated');

drop policy if exists "Project owner can update their project" on projects;
create policy "Project owner can update their project"
  on projects for update using (auth.uid() = owner_id);

drop policy if exists "Project owner can delete their project" on projects;
create policy "Project owner can delete their project"
  on projects for delete using (auth.uid() = owner_id);

-- 5. Project skills needed
create table if not exists project_skills_needed (
  project_id uuid references projects(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  slots_open int default 1,
  primary key (project_id, skill_id)
);

alter table project_skills_needed enable row level security;

drop policy if exists "Project skills are publicly viewable" on project_skills_needed;
create policy "Project skills are publicly viewable"
  on project_skills_needed for select using (true);

drop policy if exists "Project owner can manage skills" on project_skills_needed;
create policy "Project owner can manage skills"
  on project_skills_needed for all using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- 6. Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  applicant_id uuid references profiles(id) on delete cascade,
  skill_id uuid references skills(id),
  message text,
  status text default 'pending',
  created_at timestamptz default now(),
  unique (project_id, applicant_id, skill_id)
);

alter table applications enable row level security;

drop policy if exists "Applicants can view their own applications" on applications;
create policy "Applicants can view their own applications"
  on applications for select using (auth.uid() = applicant_id);

drop policy if exists "Project owner can view applications" on applications;
create policy "Project owner can view applications"
  on applications for select using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

drop policy if exists "Applicants can insert their own applications" on applications;
create policy "Applicants can insert their own applications"
  on applications for insert with check (auth.uid() = applicant_id);

drop policy if exists "Project owner can update applications" on applications;
create policy "Project owner can update applications"
  on applications for update using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- 7. Project members
create table if not exists project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  skill_id uuid references skills(id),
  role text default 'contributor',
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

alter table project_members enable row level security;

drop policy if exists "Project members are publicly viewable" on project_members;
create policy "Project members are publicly viewable"
  on project_members for select using (true);

drop policy if exists "Project owner can manage members" on project_members;
create policy "Project owner can manage members"
  on project_members for all using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- 8. Project updates
create table if not exists project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table project_updates enable row level security;

drop policy if exists "Project updates are publicly viewable" on project_updates;
create policy "Project updates are publicly viewable"
  on project_updates for select using (true);

drop policy if exists "Project members can insert updates" on project_updates;
create policy "Project members can insert updates"
  on project_updates for insert with check (
    exists (select 1 from project_members where project_id = project_updates.project_id and user_id = auth.uid())
  );

-- 9. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "Users can view their own notifications" on notifications;
create policy "Users can view their own notifications"
  on notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on notifications;
create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on notifications;
create policy "System can insert notifications"
  on notifications for insert with check (true);

-- 10. User public keys (for E2EE)
create table if not exists user_keys (
  user_id uuid primary key references profiles(id) on delete cascade,
  public_key text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_keys enable row level security;

drop policy if exists "Public keys are publicly viewable" on user_keys;
create policy "Public keys are publicly viewable"
  on user_keys for select using (true);

drop policy if exists "Users can upsert their own public key" on user_keys;
create policy "Users can upsert their own public key"
  on user_keys for all using (auth.uid() = user_id);

-- 11. Conversations (direct one-to-one; user_a / user_b order enforced by unique index)
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists idx_conversations_pair
  on conversations (least(user_a, user_b), greatest(user_a, user_b));

alter table conversations enable row level security;

drop policy if exists "Participants can view conversations" on conversations;
create policy "Participants can view conversations"
  on conversations for select using (
    auth.uid() in (user_a, user_b)
  );

drop policy if exists "Participants can insert conversations" on conversations;
create policy "Participants can insert conversations"
  on conversations for insert with check (
    auth.uid() in (user_a, user_b)
  );

-- 12. Messages (E2EE: ciphertext for the recipient, ciphertext_self for the sender's own history)
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  ciphertext      text not null,
  iv              text not null,
  ciphertext_self text,
  iv_self         text,
  created_at      timestamptz default now(),
  read_at         timestamptz
);

alter table messages enable row level security;

drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages"
  on messages for select using (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
        and auth.uid() in (user_a, user_b)
    )
  );

drop policy if exists "Participants can insert messages" on messages;
create policy "Participants can insert messages"
  on messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations
      where id = messages.conversation_id
        and auth.uid() in (user_a, user_b)
    )
  );

drop policy if exists "Participants can mark messages read" on messages;
create policy "Participants can mark messages read"
  on messages for update using (
    exists (
      select 1 from conversations
      where id = messages.conversation_id
        and auth.uid() in (user_a, user_b)
    )
  );

-- 13. Enable Realtime for messages table (required for live chat)
alter publication supabase_realtime add table messages;

-- 14. E2EE key backups (passphrase-wrapped private key for multi-device recovery)
create table if not exists key_backups (
  user_id uuid primary key references profiles(id) on delete cascade,
  wrapped_private_key text not null,
  salt text not null,
  iv text not null,
  iterations int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table key_backups enable row level security;

drop policy if exists "Users can manage their own key backup" on key_backups;
create policy "Users can manage their own key backup"
  on key_backups for all using (auth.uid() = user_id);

-- Seed skills (skip if already exist)
insert into skills (name, category)
select * from (values
  ('Frontend', 'Engineering'),
  ('Backend', 'Engineering'),
  ('Full Stack', 'Engineering'),
  ('UI/UX Design', 'Design'),
  ('Product Management', 'Product'),
  ('Mobile Dev', 'Engineering'),
  ('DevOps', 'Engineering'),
  ('Data/ML', 'Data'),
  ('Marketing', 'Marketing'),
  ('Content Writing', 'Content'),
  ('Video Editing', 'Content'),
  ('Graphic Design', 'Design'),
  ('Community Management', 'Marketing'),
  ('QA / Testing', 'Engineering'),
  ('Security', 'Engineering')
) as v(name, category)
where not exists (select 1 from skills limit 1);
