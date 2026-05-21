-- Missing indexes audit — 22 maggio 2026
-- All query patterns from application code mapped to indexes.

-- purchase_orders: critical table with zero indexes (fixed)
create index if not exists purchase_orders_user_id_idx
  on public.purchase_orders(user_id);

create index if not exists purchase_orders_user_status_idx
  on public.purchase_orders(user_id, status);

create index if not exists purchase_orders_user_created_idx
  on public.purchase_orders(user_id, created_at desc);

-- Composite index for idempotency check (user + supplier + sku + time)
create index if not exists purchase_orders_idempotency_idx
  on public.purchase_orders(user_id, supplier_email, sku, created_at desc);

-- supplier_metrics: used by agent tool get_supplier_history
create index if not exists supplier_metrics_user_idx
  on public.supplier_metrics(user_id);

create index if not exists supplier_metrics_user_name_idx
  on public.supplier_metrics(user_id, supplier_name);

-- shared_reports: used for user report listing
create index if not exists shared_reports_user_idx
  on public.shared_reports(user_id, created_at desc);
