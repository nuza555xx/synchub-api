-- ============================================================
-- UP: Create social_accounts and social_oauth_states tables
-- ============================================================

-- Social accounts table: stores connected social media accounts
create table if not exists public.social_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('facebook', 'twitter', 'linkedin', 'tiktok')),
  account_id  text not null,
  account_name text not null,
  avatar_url  text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  permissions  jsonb not null default '[]'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One account per platform+account_id per user
  unique (user_id, platform, account_id)
);

-- Indexes for common query patterns
create index if not exists idx_social_accounts_user_id
  on public.social_accounts (user_id);

create index if not exists idx_social_accounts_platform
  on public.social_accounts (platform);

-- OAuth state table: temporary CSRF state for OAuth flows
create table if not exists public.social_oauth_states (
  id          uuid primary key default gen_random_uuid(),
  state       text not null unique,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('facebook', 'twitter', 'linkedin', 'tiktok')),
  created_at  timestamptz not null default now()
);

-- Auto-expire stale states (older than 10 minutes)
create index if not exists idx_social_oauth_states_created_at
  on public.social_oauth_states (created_at);

-- RLS policies
alter table public.social_accounts enable row level security;
alter table public.social_oauth_states enable row level security;

-- Users can read their own social accounts
drop policy if exists "Users can view own social accounts" on public.social_accounts;
create policy "Users can view own social accounts"
  on public.social_accounts for select
  using (auth.uid() = user_id);

-- Users can insert their own social accounts
drop policy if exists "Users can insert own social accounts" on public.social_accounts;
create policy "Users can insert own social accounts"
  on public.social_accounts for insert
  with check (auth.uid() = user_id);

-- Users can update their own social accounts
drop policy if exists "Users can update own social accounts" on public.social_accounts;
create policy "Users can update own social accounts"
  on public.social_accounts for update
  using (auth.uid() = user_id);

-- Users can delete their own social accounts
drop policy if exists "Users can delete own social accounts" on public.social_accounts;
create policy "Users can delete own social accounts"
  on public.social_accounts for delete
  using (auth.uid() = user_id);

-- Users can manage their own oauth states
drop policy if exists "Users can view own oauth states" on public.social_oauth_states;
create policy "Users can view own oauth states"
  on public.social_oauth_states for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own oauth states" on public.social_oauth_states;
create policy "Users can insert own oauth states"
  on public.social_oauth_states for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own oauth states" on public.social_oauth_states;
create policy "Users can delete own oauth states"
  on public.social_oauth_states for delete
  using (auth.uid() = user_id);

-- Service role bypass (for server-side operations)
drop policy if exists "Service role full access social_accounts" on public.social_accounts;
create policy "Service role full access social_accounts"
  on public.social_accounts for all
  using (auth.role() = 'service_role');

drop policy if exists "Service role full access social_oauth_states" on public.social_oauth_states;
create policy "Service role full access social_oauth_states"
  on public.social_oauth_states for all
  using (auth.role() = 'service_role');