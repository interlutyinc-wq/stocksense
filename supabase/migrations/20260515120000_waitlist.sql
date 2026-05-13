-- Public waitlist signups (landing page)

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_lower_key
  on public.waitlist (lower(email));

create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

drop policy if exists "anon_insert_waitlist" on public.waitlist;

-- Allow unauthenticated visitors (anon) to add their email only
create policy "anon_insert_waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);
