-- Add Omise-related columns to subscriptions and plans
-- subscriptions: link to Omise schedule & customer
alter table public.subscriptions
  add column if not exists omise_schedule_id text unique,
  add column if not exists omise_customer_id text;

-- plans: Omise price amounts in smallest currency unit (satang for THB)
alter table public.plans
  add column if not exists omise_price_monthly_amount_subunits integer,
  add column if not exists omise_price_yearly_amount_subunits  integer;
