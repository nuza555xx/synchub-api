-- Add name and description to draft_posts
alter table public.draft_posts
  add column if not exists name text not null default '',
  add column if not exists description text not null default '';
