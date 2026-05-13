-- StockSense onboarding: Shopify connection + suppliers (RLS)

create table if not exists public.shopify_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_domain text not null,
  access_token text not null,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, shop_domain)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  skus text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopify_connections_user_id_idx
  on public.shopify_connections (user_id);

create index if not exists suppliers_user_id_idx
  on public.suppliers (user_id);

alter table public.shopify_connections enable row level security;
alter table public.suppliers enable row level security;

create policy "shopify_select_own"
  on public.shopify_connections for select
  using (auth.uid() = user_id);

create policy "shopify_insert_own"
  on public.shopify_connections for insert
  with check (auth.uid() = user_id);

create policy "shopify_update_own"
  on public.shopify_connections for update
  using (auth.uid() = user_id);

create policy "shopify_delete_own"
  on public.shopify_connections for delete
  using (auth.uid() = user_id);

create policy "suppliers_select_own"
  on public.suppliers for select
  using (auth.uid() = user_id);

create policy "suppliers_insert_own"
  on public.suppliers for insert
  with check (auth.uid() = user_id);

create policy "suppliers_update_own"
  on public.suppliers for update
  using (auth.uid() = user_id);

create policy "suppliers_delete_own"
  on public.suppliers for delete
  using (auth.uid() = user_id);
