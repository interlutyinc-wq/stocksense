-- Stripe billing fields on profiles

alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'starter', 'agent', 'enterprise')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
