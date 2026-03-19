-- Make media bucket private (was public)
update storage.buckets
  set public = false
  where id = 'media';

-- Drop the public read policy (no longer needed for private bucket)
drop policy if exists "Public media read" on storage.objects;
