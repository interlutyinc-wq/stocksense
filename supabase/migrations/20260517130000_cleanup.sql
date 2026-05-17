-- Cleanup: drop orphan tables created during the HTML prototype phase.
-- These were never tracked in migrations, have no FK constraints to
-- auth.users, and are not referenced by any application code.

-- ── Drop orphan tables ────────────────────────────────────────────────────────

drop table if exists public."Inventory"  cascade;
drop table if exists public."Users"      cascade;
drop table if exists public."Waitlist"   cascade;

-- ── profiles: add missing delete policy ──────────────────────────────────────
-- Users can hard-delete their own profile row.
-- The FK (profiles.id → auth.users.id ON DELETE CASCADE) already handles
-- cleanup when the auth account itself is removed, but this policy lets
-- the app explicitly delete the row while the account still exists.

drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);
