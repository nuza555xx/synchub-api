-- ============================================================
-- UP: Add code_verifier to social_oauth_states
-- ============================================================

alter table public.social_oauth_states 
  add column if not exists code_verifier text;

comment on column public.social_oauth_states.code_verifier is 'PKCE code verifier for OAuth 2.0 (X/Twitter, etc.)';
