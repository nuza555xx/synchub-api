-- ============================================================
-- UP: Add organization_id to existing resource tables
--     + migrate existing data to personal orgs
-- ============================================================

-- Step 1: Add organization_id column to resource tables (nullable first for migration)
alter table public.social_accounts
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.posts
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.activity_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Step 2: Create personal org for every existing user who has resources
-- For each distinct user_id in social_accounts, posts, activity_logs → create org + member + subscription
do $$
declare
  r record;
  new_org_id uuid;
  free_plan_id uuid;
begin
  -- Get the free plan ID
  select id into free_plan_id from public.plans where name = 'free' limit 1;

  for r in (
    select distinct user_id from (
      select user_id from public.social_accounts
      union
      select user_id from public.posts
    ) all_users
  )
  loop
    -- Create personal org
    new_org_id := gen_random_uuid();
    insert into public.organizations (id, name, slug, owner_id)
    values (new_org_id, 'Personal', 'personal-' || r.user_id, r.user_id)
    on conflict (slug) do nothing;

    -- Get the org_id (needed if it already existed)
    select id into new_org_id from public.organizations where slug = 'personal-' || r.user_id;

    -- Add owner membership
    insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
    values (new_org_id, r.user_id, 'owner', 'active', now())
    on conflict (organization_id, user_id) do nothing;

    -- Create free subscription
    insert into public.subscriptions (organization_id, plan_id)
    values (new_org_id, free_plan_id)
    on conflict (organization_id) do nothing;

    -- Migrate resources
    update public.social_accounts set organization_id = new_org_id where user_id = r.user_id;
    update public.posts set organization_id = new_org_id where user_id = r.user_id;
    update public.activity_logs set organization_id = new_org_id where user_id = r.user_id;
  end loop;
end;
$$;

-- Step 3: Make organization_id NOT NULL after migration
alter table public.social_accounts alter column organization_id set not null;
alter table public.posts alter column organization_id set not null;
alter table public.activity_logs alter column organization_id set not null;

-- Step 4: Add indexes
create index if not exists idx_social_accounts_org_id on public.social_accounts (organization_id);
create index if not exists idx_posts_org_id on public.posts (organization_id);
create index if not exists idx_activity_logs_org_id on public.activity_logs (organization_id);

-- Step 5: Update RLS policies to use organization-based access
-- Social accounts: replace user_id check with org membership check
drop policy if exists "Users can view own social accounts" on public.social_accounts;
drop policy if exists "Users can insert own social accounts" on public.social_accounts;
drop policy if exists "Users can update own social accounts" on public.social_accounts;
drop policy if exists "Users can delete own social accounts" on public.social_accounts;

drop policy if exists "Org members can view social accounts" on public.social_accounts;
create policy "Org members can view social accounts"
  on public.social_accounts for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Service role manage social accounts" on public.social_accounts;
create policy "Service role manage social accounts"
  on public.social_accounts for all
  using (auth.role() = 'service_role');

-- Posts: replace user_id check with org membership check
drop policy if exists "Users can manage own drafts" on public.posts;

drop policy if exists "Org members can view posts" on public.posts;
create policy "Org members can view posts"
  on public.posts for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Service role manage posts" on public.posts;
create policy "Service role manage posts"
  on public.posts for all
  using (auth.role() = 'service_role');

-- Activity logs: replace user_id check with org membership check
drop policy if exists "Users can view own activity logs" on public.activity_logs;

drop policy if exists "Org members can view activity logs" on public.activity_logs;
create policy "Org members can view activity logs"
  on public.activity_logs for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Update storage policies to use org-based paths
drop policy if exists "Users can upload own media" on storage.objects;
drop policy if exists "Users can delete own media" on storage.objects;

drop policy if exists "Org members can upload media" on storage.objects;
create policy "Org members can upload media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'media'
  );

drop policy if exists "Org members can delete media" on storage.objects;
create policy "Org members can delete media"
  on storage.objects
  for delete
  using (
    bucket_id = 'media'
  );
