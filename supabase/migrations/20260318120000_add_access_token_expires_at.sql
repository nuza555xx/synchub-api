-- Add access_token_expires_at column to track access token expiry separately
alter table public.social_accounts
  add column if not exists access_token_expires_at timestamptz;
