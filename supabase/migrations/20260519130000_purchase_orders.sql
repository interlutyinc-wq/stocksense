-- purchase_orders: tracks AI-generated POs from draft to sent

create table if not exists public.purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  supplier_id  uuid references public.suppliers (id) on delete set null,
  supplier_name text not null,
  supplier_email text not null,
  sku          text not null,
  product_name text not null,
  quantity     integer not null check (quantity > 0),
  unit_cost    numeric,
  total_cost   numeric,
  urgency      text check (urgency in ('critical', 'high', 'medium', 'low')),
  reasoning    text,
  status       text not null default 'draft'
               check (status in ('draft', 'approved', 'sent')),
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create index if not exists purchase_orders_user_id_idx
  on public.purchase_orders (user_id);

create index if not exists purchase_orders_status_idx
  on public.purchase_orders (user_id, status);

alter table public.purchase_orders enable row level security;

create policy "po_select_own"
  on public.purchase_orders for select
  using (auth.uid() = user_id);

create policy "po_insert_own"
  on public.purchase_orders for insert
  with check (auth.uid() = user_id);

create policy "po_update_own"
  on public.purchase_orders for update
  using (auth.uid() = user_id);

create policy "po_delete_own"
  on public.purchase_orders for delete
  using (auth.uid() = user_id);
