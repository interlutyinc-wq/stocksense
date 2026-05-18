-- Add business_model to profiles
-- Drives agent prompt behavior: inventory | dropshipping | hybrid

alter table public.profiles
  add column if not exists business_model text
  not null default 'inventory'
  check (business_model in ('inventory', 'dropshipping', 'hybrid'));

comment on column public.profiles.business_model is
  'inventory = own stock / reorder logic | dropshipping = supplier fulfills directly | hybrid = mix of both';
