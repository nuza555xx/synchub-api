-- Add organization_id to social_oauth_states so callbacks can associate accounts with orgs

alter table public.social_oauth_states 
  add column if not exists organization_id uuid references public.organizations(id);
