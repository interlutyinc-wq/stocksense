-- Viral growth tables

-- Shared reports: public inventory analysis snapshots
create table if not exists public.shared_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  shop_domain  text not null,
  summary      text not null,
  data         jsonb not null,
  views        integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists shared_reports_user_idx on public.shared_reports(user_id);

alter table public.shared_reports enable row level security;

-- Anyone can read shared reports (public)
create policy "shared_reports_public_read"
  on public.shared_reports for select
  using (true);

-- Only owner can insert
create policy "shared_reports_insert_own"
  on public.shared_reports for insert
  with check (auth.uid() = user_id);

create policy "shared_reports_delete_own"
  on public.shared_reports for delete
  using (auth.uid() = user_id);

-- Referrals: track who referred who
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users(id);

-- Auto-generate referral code on profile creation
create or replace function public.generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := lower(substring(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_referral_code on public.profiles;
create trigger set_referral_code
  before insert on public.profiles
  for each row execute procedure public.generate_referral_code();

-- Update existing profiles with referral codes
update public.profiles
set referral_code = lower(substring(replace(id::text, '-', ''), 1, 8))
where referral_code is null;
