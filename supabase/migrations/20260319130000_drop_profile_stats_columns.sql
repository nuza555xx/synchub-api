-- Drop unused profile stats columns from social_accounts
alter table public.social_accounts
  drop column if exists followers_count,
  drop column if exists following_count,
  drop column if exists likes_count,
  drop column if exists video_count;
