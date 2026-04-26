-- Add max_workspaces column to plans (0 = unlimited)
alter table public.plans add column if not exists max_workspaces int not null default 1;

-- Update existing plans
update public.plans set max_workspaces = 1  where name = 'free';
update public.plans set max_workspaces = 3  where name = 'starter';
update public.plans set max_workspaces = 10 where name = 'professional';
update public.plans set max_workspaces = 0  where name = 'business';
