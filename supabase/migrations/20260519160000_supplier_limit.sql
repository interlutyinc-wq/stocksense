-- Enforce supplier limit per plan at DB level
-- Runs before every INSERT on public.suppliers

create or replace function public.check_supplier_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan text;
  supplier_count integer;
  max_allowed integer;
begin
  -- Get user's plan
  select plan into user_plan from public.profiles where id = new.user_id;

  -- Map plan to max suppliers
  max_allowed := case user_plan
    when 'free'     then 1
    when 'starter'  then 10
    when 'pro'      then -1  -- unlimited
    when 'agency'   then -1  -- unlimited
    else 1
  end;

  -- Skip check if unlimited
  if max_allowed = -1 then
    return new;
  end if;

  -- Count existing suppliers
  select count(*) into supplier_count
    from public.suppliers where user_id = new.user_id;

  if supplier_count >= max_allowed then
    raise exception 'Supplier limit reached for your plan. Upgrade to add more suppliers.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_supplier_limit on public.suppliers;

create trigger enforce_supplier_limit
  before insert on public.suppliers
  for each row
  execute procedure public.check_supplier_limit();
