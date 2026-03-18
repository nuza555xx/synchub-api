-- Add profile stats columns to social_accounts
alter table public.social_accounts
  add column if not exists username text,
  add column if not exists is_verified boolean default false,
  add column if not exists followers_count integer default 0,
  add column if not exists following_count integer default 0,
  add column if not exists likes_count integer default 0,
  add column if not exists video_count integer default 0;
