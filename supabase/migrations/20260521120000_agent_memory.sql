-- True Agent memory tables
-- inventory_snapshots: daily inventory levels for velocity calculation
-- supplier_metrics: real lead times learned from PO history
-- analysis_history: past analyses for agent memory

create table if not exists public.inventory_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  shop_domain text not null,
  sku         text not null,
  stock_level integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists inventory_snapshots_user_sku_idx
  on public.inventory_snapshots(user_id, sku, recorded_at desc);

alter table public.inventory_snapshots enable row level security;

create policy "snapshots_own"
  on public.inventory_snapshots for all
  using (auth.uid() = user_id);

-- supplier_metrics: learned from actual PO history
create table if not exists public.supplier_metrics (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  supplier_id       uuid references public.suppliers(id) on delete set null,
  supplier_name     text not null,
  avg_lead_days     numeric,
  reliability_score numeric check (reliability_score between 0 and 1),
  total_pos         integer not null default 0,
  last_po_at        timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists supplier_metrics_user_idx
  on public.supplier_metrics(user_id);

alter table public.supplier_metrics enable row level security;

create policy "supplier_metrics_own"
  on public.supplier_metrics for all
  using (auth.uid() = user_id);

-- analysis_history: agent memory across sessions
create table if not exists public.analysis_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  shop_domain     text not null,
  business_model  text not null default 'inventory',
  recommendations jsonb not null,
  total_skus      integer not null default 0,
  critical_count  integer not null default 0,
  outcomes        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists analysis_history_user_idx
  on public.analysis_history(user_id, created_at desc);

alter table public.analysis_history enable row level security;

create policy "analysis_history_own"
  on public.analysis_history for all
  using (auth.uid() = user_id);
