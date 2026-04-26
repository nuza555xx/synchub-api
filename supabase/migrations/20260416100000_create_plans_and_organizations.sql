-- ============================================================
-- UP: Create plans, organizations, organization_members, subscriptions
-- ============================================================

-- Plans table: pricing tiers with limits and feature flags
create table if not exists public.plans (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,          -- 'free', 'starter', 'professional', 'business'
  display_name          text not null,                 -- 'Free', 'Starter', etc.

  -- Limits (0 = unlimited)
  max_members           int not null default 1,
  max_social_accounts   int not null default 3,
  max_posts_per_month   int not null default 30,
  max_scheduled_posts   int not null default 10,
  max_media_storage_mb  int not null default 500,

  -- Feature flags
  has_analytics         boolean not null default false,
  has_inbox             boolean not null default false,
  has_quick_replies     boolean not null default false,
  has_hashtag_manager   boolean not null default false,
  has_bulk_scheduling   boolean not null default false,
  has_activity_logs     boolean not null default false,
  has_priority_support  boolean not null default false,

  -- Platform access
  allowed_platforms     text[] not null default array['facebook', 'twitter'],

  price_monthly         decimal(10,2) not null default 0,
  price_yearly          decimal(10,2) not null default 0,
  is_active             boolean not null default true,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now()
);

-- Seed default plans
insert into public.plans (name, display_name, max_members, max_social_accounts, max_posts_per_month, max_scheduled_posts, max_media_storage_mb, has_analytics, has_inbox, has_quick_replies, has_hashtag_manager, has_bulk_scheduling, has_activity_logs, has_priority_support, allowed_platforms, price_monthly, price_yearly, sort_order) values
  ('free',         'Free',         1,  3,  30,  10,   500, false, false, false, false, false, false, false, array['facebook','twitter'],                      0,      0, 0),
  ('starter',      'Starter',      3,  5, 100,  30,  2048, true,  false, false, true,  false, false, false, array['facebook','twitter','tiktok'],            299,   2990, 1),
  ('professional', 'Professional', 10, 15, 500, 100, 10240, true,  true,  true,  true,  true,  true,  false, array['facebook','twitter','linkedin','tiktok'], 799,   7990, 2),
  ('business',     'Business',      0,  0,   0,   0, 51200, true,  true,  true,  true,  true,  true,  true,  array['facebook','twitter','linkedin','tiktok'], 1999, 19990, 3)
on conflict (name) do nothing;

-- Organizations table
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  avatar_url  text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_organizations_owner_id on public.organizations (owner_id);
create index if not exists idx_organizations_slug on public.organizations (slug);

-- Organization members table
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'viewer'
                  check (role in ('owner', 'admin', 'editor', 'moderator', 'viewer')),
  invited_by      uuid references auth.users(id),
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  status          text not null default 'active'
                  check (status in ('pending', 'active', 'suspended')),
  created_at      timestamptz not null default now(),

  unique (organization_id, user_id)
);

create index if not exists idx_org_members_org_id on public.organization_members (organization_id);
create index if not exists idx_org_members_user_id on public.organization_members (user_id);

-- Subscriptions table
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  plan_id               uuid not null references public.plans(id),
  status                text not null default 'active'
                        check (status in ('active', 'past_due', 'canceled', 'trialing')),
  billing_cycle         text not null default 'monthly'
                        check (billing_cycle in ('monthly', 'yearly')),
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz not null default (now() + interval '30 days'),
  cancel_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (organization_id)
);

-- RLS for plans (public read)
alter table public.plans enable row level security;

drop policy if exists "Anyone can read plans" on public.plans;
create policy "Anyone can read plans"
  on public.plans for select
  using (true);

drop policy if exists "Service role full access plans" on public.plans;
create policy "Service role full access plans"
  on public.plans for all
  using (auth.role() = 'service_role');

-- RLS for organizations
alter table public.organizations enable row level security;

drop policy if exists "Members can view their organizations" on public.organizations;
create policy "Members can view their organizations"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Service role full access organizations" on public.organizations;
create policy "Service role full access organizations"
  on public.organizations for all
  using (auth.role() = 'service_role');

-- RLS for organization_members
alter table public.organization_members enable row level security;

drop policy if exists "Members can view org members" on public.organization_members;
create policy "Members can view org members"
  on public.organization_members for select
  using (
    organization_id in (
      select organization_id from public.organization_members om
      where om.user_id = auth.uid() and om.status = 'active'
    )
  );

drop policy if exists "Service role full access org_members" on public.organization_members;
create policy "Service role full access org_members"
  on public.organization_members for all
  using (auth.role() = 'service_role');

-- RLS for subscriptions
alter table public.subscriptions enable row level security;

drop policy if exists "Members can view their subscription" on public.subscriptions;
create policy "Members can view their subscription"
  on public.subscriptions for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Service role full access subscriptions" on public.subscriptions;
create policy "Service role full access subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');
