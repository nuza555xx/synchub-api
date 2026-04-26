do $$
begin
  -- Rename table if it exists and target name is free
  if exists (select 1 from pg_tables where tablename = 'draft_posts' and schemaname = 'public') 
     and not exists (select 1 from pg_tables where tablename = 'posts' and schemaname = 'public') then
    alter table public.draft_posts rename to posts;
  end if;
  
  -- Rename idx_draft_posts_user_id if it exists and target name is free
  if exists (select 1 from pg_indexes where indexname = 'idx_draft_posts_user_id' and (tablename = 'posts' or tablename = 'draft_posts'))
     and not exists (select 1 from pg_indexes where indexname = 'idx_posts_user_id') then
    alter index if exists idx_draft_posts_user_id rename to idx_posts_user_id;
  end if;

  -- Rename idx_draft_posts_status if it exists and target name is free
  if exists (select 1 from pg_indexes where indexname = 'idx_draft_posts_status' and (tablename = 'posts' or tablename = 'draft_posts'))
     and not exists (select 1 from pg_indexes where indexname = 'idx_posts_status') then
    alter index if exists idx_draft_posts_status rename to idx_posts_status;
  end if;
end $$;
