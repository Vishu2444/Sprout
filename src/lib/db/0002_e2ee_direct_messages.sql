-- Sprout E2EE Direct Messages — Migration 0002
-- Drops the old conversations/participants/messages tables and replaces
-- them with the simplified user_a / user_b schema.
-- Run this in your Supabase SQL editor AFTER the base schema (schema.sql).

-- ── Step 1: drop old tables (cascade handles dependencies) ──
drop table if exists conversation_participants cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
-- user_keys is kept (its shape matches what we need)

-- ── Step 2: user_keys (already exists in schema.sql; re-declared here for idempotency) ──
create table if not exists user_keys (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  public_key text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_keys enable row level security;

drop policy if exists "Anyone can read public keys" on user_keys;
create policy "Anyone can read public keys"
  on user_keys for select using (true);

drop policy if exists "Users can upsert their own public key" on user_keys;
create policy "Users can upsert their own public key"
  on user_keys for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own public key" on user_keys;
create policy "Users can update their own public key"
  on user_keys for update using (auth.uid() = user_id);

-- ── Step 3: conversations (simplified — no separate participants table) ──
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enforce one conversation per user-pair regardless of which user is a vs b
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

-- ── Step 4: messages ──
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

-- ── Step 5: enable Supabase Realtime on messages ──
alter publication supabase_realtime add table messages;
