-- Change social_account_id (single) to social_account_ids (array) on posts table
alter table public.posts
  add column social_account_ids uuid[] default '{}';

-- Migrate existing data
update public.posts
  set social_account_ids = array[social_account_id]
  where social_account_id is not null;

-- Drop old column and its FK constraint
alter table public.posts
  drop column social_account_id;
