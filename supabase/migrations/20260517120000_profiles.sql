-- public.profiles
-- Mirrors auth.users for app-level queries and Table Editor visibility.
-- Populated automatically via trigger on every new signup.
-- Backfills any users who registered before this migration.

-- ── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx
  on public.profiles (lower(email));

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Each user can only read and update their own row.
-- INSERT is handled exclusively by the trigger (security definer),
-- so no insert policy is needed for the anon/authenticated roles.

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Trigger function ──────────────────────────────────────────────────────────

-- Runs as the table owner (security definer) so it can write to
-- public.profiles even during the anonymous signup flow, where
-- the caller has no direct insert permission on the table.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── Trigger ───────────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ── Backfill ──────────────────────────────────────────────────────────────────

-- Populate profiles for any users who signed up before this migration ran.
insert into public.profiles (id, email, created_at, updated_at)
select
  id,
  email,
  coalesce(created_at, now()),
  now()
from auth.users
on conflict (id) do nothing;
