-- Draft posts table
create table if not exists public.draft_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  content text not null default '',
  media_type text not null check (media_type in ('photo', 'video')),
  media_urls text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for user listing
create index if not exists idx_draft_posts_user_id on public.draft_posts(user_id);
create index if not exists idx_draft_posts_status on public.draft_posts(user_id, status);

-- RLS
alter table public.draft_posts enable row level security;

create policy "Users can manage own drafts"
  on public.draft_posts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

-- Storage policy: users can upload to their own folder
create policy "Users can upload own media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: public read
create policy "Public media read"
  on storage.objects
  for select
  using (bucket_id = 'media');

-- Storage policy: users can delete own media
create policy "Users can delete own media"
  on storage.objects
  for delete
  using (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
