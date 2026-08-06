-- ============================================================
-- Flatten farm sourcing: farms + produce_items + purchases -> purchases
--
-- The three-table sourcing model was more structure than this side of the
-- business needs. Supplier and item names become plain text on the purchase
-- row instead of lookup tables plus foreign keys.
--
-- Safe to run as written: all three tables were empty at authoring time
-- (verified via the dashboard), so there is nothing to migrate. The guard
-- below turns that assumption into an enforced precondition rather than a
-- comment — if any row exists, the migration aborts instead of destroying it.
--
-- Not touched, deliberately:
--   order_items — orders can contain mixed box types, which is what a line
--                 items table is for.
--   payments    — Stripe alongside cash/check/venmo/COD means one order can
--                 have several payment rows, and stripe_event_id has to be
--                 recorded idempotently or webhook retries double-count.
-- ============================================================

-- Abort rather than silently discard data if this runs somewhere non-empty.
do $$
declare
  n bigint;
begin
  select (select count(*) from public.farms)
       + (select count(*) from public.produce_items)
       + (select count(*) from public.purchases)
    into n;
  if n > 0 then
    raise exception
      'Sourcing tables are not empty (% rows). Back up and migrate manually.', n;
  end if;
end $$;

-- Old purchases is empty and its shape is changing substantially; replace it.
drop table if exists public.purchases;
drop table if exists public.produce_items;
drop table if exists public.farms;

create table public.purchases (
  id             uuid primary key default gen_random_uuid(),

  -- Supplier and item as free text. Autocomplete in the admin UI can be driven
  -- by `select distinct farm_name from purchases`, which is all the old lookup
  -- tables were really providing at this scale.
  farm_name      text not null,
  farm_contact   text,
  item_name      text not null,

  purchase_date  date not null default current_date,
  description    text,
  quantity       numeric check (quantity is null or quantity > 0),
  unit           text,
  cost_cents     integer not null default 0 check (cost_cents >= 0),
  invoice_ref    text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- Sourcing data is internal bookkeeping: admins only, never customers.
alter table public.purchases enable row level security;

create policy purchases_admin_read on public.purchases
  for select to authenticated using ((select public.is_admin()));

create policy purchases_admin_write on public.purchases
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- RLS decides which rows; grants decide whether the table is reachable at all.
-- Both are required.
grant select, insert, update, delete on public.purchases to authenticated;

-- Common query is "what did we buy recently", plus per-supplier rollups.
create index purchases_date_idx on public.purchases (purchase_date desc);
create index purchases_farm_name_idx on public.purchases (farm_name);
