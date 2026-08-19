-- ============================================================
-- order_items.pricing_mode — which figure was actually typed
--
-- WHY: a restaurant line can be quoted either way. "$4.50 a pound, 12 pounds"
-- gives a unit price; "the whole crate, $50" gives a line total. The app stores
-- both columns either way, deriving whichever was not entered — but until now
-- the database had no record of WHICH one came from a human.
--
-- That distinction is not recoverable after the fact. $50 across 3 stores a
-- $50.00 total and a $16.67 unit price, and 1667 * 3 = 5001 ≠ 5000 does reveal
-- that rounding happened — but $100 across 4 divides evenly and looks identical
-- to a genuine $25-each line. So "did she quote a unit price?" cannot be
-- answered by comparing the numbers.
--
-- It matters for sales analysis. Averaging unit_price_cents across lines treats
-- a derived $16.67 as if someone had actually priced tomatoes at $16.67 each.
-- With this column that row can be excluded, or weighted, on purpose:
--
--   select avg(unit_price_cents)
--     from order_items
--    where pricing_mode = 'each';   -- only real per-unit prices
--
-- It will also let a future line editor reopen a line the way it was entered,
-- rather than guessing.
-- ============================================================

-- An enum, matching how every other closed set in this schema is modelled
-- (fulfillment_kind, order_status, checkout_method, cycle_status). Idempotent
-- because Postgres has no `create type if not exists`.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'pricing_mode') then
    create type public.pricing_mode as enum ('each', 'total');
  end if;
end $$;

-- NOT NULL with a default, so every existing row and every writer that predates
-- this column reports 'each'. That is the truthful backfill: box lines are
-- priced per box, and the only custom lines written before this migration came
-- from a form that offered no other option.
alter table public.order_items
  add column if not exists pricing_mode public.pricing_mode not null default 'each';

comment on column public.order_items.pricing_mode is
  'Which figure a human entered: ''each'' = unit_price_cents was typed and '
  'line_total_cents derived; ''total'' = line_total_cents was typed and '
  'unit_price_cents is an approximation (may not divide evenly). Filter on this '
  'before averaging unit_price_cents for sales analysis.';

-- No index. The table is small, and analysis over it will scan regardless; an
-- index on a two-value column would not be used. Revisit if order_items grows
-- past the point where a sequential scan hurts.

-- No RLS change. Policies on order_items are row-scoped (order_items_select_own
-- and friends) and do not enumerate columns, so a new column inherits them.
