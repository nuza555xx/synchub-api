-- Activity logs table: tracks user actions on social accounts
create table if not exists public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  action        text not null,
  resource_type text not null,
  resource_id   text,
  details       jsonb not null default '{}'::jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_activity_logs_user_id
  on public.activity_logs (user_id);

create index if not exists idx_activity_logs_action
  on public.activity_logs (action);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs (created_at desc);

-- RLS
alter table public.activity_logs enable row level security;

drop policy if exists "Users can view own activity logs" on public.activity_logs;
create policy "Users can view own activity logs"
  on public.activity_logs for select
  using (auth.uid() = user_id);

-- Service role can insert (bypasses RLS)
