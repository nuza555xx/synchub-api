-- Rename draft_posts table to posts
alter table public.draft_posts rename to posts;

-- Rename indexes
alter index idx_draft_posts_user_id rename to idx_posts_user_id;
alter index idx_draft_posts_status rename to idx_posts_status;
