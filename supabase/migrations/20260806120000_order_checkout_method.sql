-- ============================================================
-- Record how each order was placed: as a guest, or from an account.
--
-- This was already *derivable* — orders.customer_id is null for a guest and set
-- for a signed-in customer — but derived is not the same as durable. Both
-- foreign keys in this chain are `on delete set null`, so if a customers row
-- is ever removed, every order it owned silently flips to customer_id = null
-- and is indistinguishable from a guest order. The guest/account split would
-- quietly drift toward "guest" over time with no way to notice.
--
-- Account deletion (app/My-Account/actions.ts) deliberately anonymizes the
-- customers row rather than deleting it, precisely to avoid that. This column
-- means the metric no longer depends on anyone remembering why.
--
-- Stamped once at insert and never updated: it describes an event, not current
-- state. A customer who signs up later does not retroactively turn their old
-- guest orders into account orders.
-- ============================================================

create type public.checkout_method as enum ('guest', 'account');

alter table public.orders
  add column checkout_method public.checkout_method;

-- Backfill from the existing signal before making the column required.
update public.orders
   set checkout_method = case
         when customer_id is null then 'guest'::public.checkout_method
         else 'account'::public.checkout_method
       end
 where checkout_method is null;

alter table public.orders
  alter column checkout_method set not null;

-- 'guest' is the safe default: an insert that does not set the column is one
-- that did not go through the signed-in path.
alter table public.orders
  alter column checkout_method set default 'guest';

-- Reporting reads this grouped by method, often alongside placed_at.
create index orders_checkout_method_idx
  on public.orders (checkout_method, placed_at desc);

-- The column is written by the same INSERT that orders_insert_own already
-- allows, so no policy change is needed. It is deliberately NOT added to any
-- UPDATE grant: authenticated holds `update (name, email, phone)` on customers
-- only, and nothing grants UPDATE on orders to anon/authenticated, so a client
-- cannot rewrite its own checkout method after the fact.
comment on column public.orders.checkout_method is
  'How the order was placed. Stamped at insert; never updated. Durable version of the customer_id null-check, which breaks if a customers row is removed.';
