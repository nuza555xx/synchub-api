-- Add platform_settings jsonb column for per-platform publish options (TikTok privacy, etc.)
alter table public.posts
  add column if not exists platform_settings jsonb not null default '{}';
