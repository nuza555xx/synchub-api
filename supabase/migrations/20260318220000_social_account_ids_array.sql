-- Change social_account_id (single) to social_account_ids (array) on posts table
alter table public.posts
  add column if not exists social_account_ids uuid[] default '{}';

-- Migrate existing data only if social_account_id still exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='posts' and column_name='social_account_id') then
    update public.posts
      set social_account_ids = array[social_account_id]
      where social_account_id is not null;
      
    alter table public.posts
      drop column social_account_id;
  end if;
end $$;
