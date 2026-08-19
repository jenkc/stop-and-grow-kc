-- ============================================================
-- customers: address columns, so one row holds everything we know
--
-- WHY: the order form prefills a signed-in customer's details, and until now
-- that meant reading name/email from customers and phone/address from their
-- most recent order — two sources, joined at read time, for one concept.
-- Putting them on the customer row makes it a single lookup and gives the
-- address somewhere to live that is not "whatever the last order happened to
-- say".
--
-- HOW IT FILLS: placeOrder() writes these back whenever a SIGNED-IN customer
-- orders. Self-maintaining — the first order is typed in full, every one after
-- starts prefilled, and a move updates it on the next order. There is no
-- profile editor to build and nothing for the customer to maintain.
--
-- Guest orders do NOT write here. A guest has no customers row to write to,
-- and matching guests to accounts by name or email would attach one person's
-- address to another's record.
--
-- The address stays denormalised ONTO each order as well (orders.ship_*). That
-- is deliberate and not redundancy: an order is a historical record of where
-- something was delivered, and it must not change when the customer later
-- moves. These columns are the current default; ship_* is what happened.
--
-- All nullable with no default: unknown until they order, and "" would be a
-- worse answer than NULL for "we have not asked yet".
-- ============================================================

alter table public.customers
  add column if not exists ship_street text,
  add column if not exists ship_apt    text,
  add column if not exists ship_city   text,
  add column if not exists ship_state  text,
  add column if not exists ship_zip    text;

-- Same shape as the equivalents on orders, so a value that is valid to deliver
-- to is valid to save. Idempotent: Postgres has no ADD CONSTRAINT IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_ship_state_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_ship_state_check
      check (ship_state is null or char_length(ship_state) = 2);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_ship_zip_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_ship_zip_check
      check (ship_zip is null or ship_zip ~ '^[0-9]{5}(-[0-9]{4})?$');
  end if;
end $$;

comment on column public.customers.ship_street is
  'Current default delivery address, written back from the customer''s most '
  'recent signed-in order. NOT a historical record — orders.ship_* holds where '
  'each order actually went and must never be updated from here.';

-- No index: these are only ever read by primary key or auth_id, both already
-- indexed. No RLS change: the customers policies are row-scoped and do not
-- enumerate columns, so new columns inherit them.
--
-- Verified 2026-08-19: `authenticated` holds only SELECT on public.customers —
-- no UPDATE grant. Grants sit BELOW RLS, so the customers_update_own policy
-- cannot be exercised by a client regardless of what it permits, and no signed
-- in user can write their own is_admin. The write-back therefore goes through
-- the service role in placeOrder(), which is the same path every other order
-- write already uses.
