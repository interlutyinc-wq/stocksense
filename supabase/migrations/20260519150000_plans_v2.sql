-- Update plan constraint to include pro and agency
-- 'agent' kept for backward compatibility

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'agent', 'pro', 'agency', 'enterprise'));

-- Rename existing 'agent' plans to 'pro'
update public.profiles set plan = 'pro' where plan = 'agent';
