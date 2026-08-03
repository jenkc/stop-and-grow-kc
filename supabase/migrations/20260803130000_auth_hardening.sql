-- Clears the remaining security and performance advisors.
-- AUTH-SETUP.md steps A4 and A5, plus cleanup of a duplicate index that A2
-- created by accident.

-- ============================================================
-- Duplicate index
-- ============================================================

-- customers_auth_key already existed with an identical definition
-- (unique btree (auth_id) where auth_id is not null). A2 added
-- customers_auth_id_key under a different name, so `if not exists` did not
-- catch it. Two identical unique indexes cost writes and buy nothing.
drop index if exists public.customers_auth_id_key;

-- ============================================================
-- A4 — SECURITY DEFINER execute grants
-- ============================================================

-- is_admin()'s ACL was `=X/postgres`, which is a grant to PUBLIC. `anon` and
-- `authenticated` inherit from PUBLIC, so revoking from `anon` by name does
-- nothing — the grant has to come off PUBLIC, then go back to `authenticated`
-- alone. RLS evaluates the function as the querying role, so `authenticated`
-- must keep EXECUTE or every admin policy breaks.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Event-trigger function: fired by the system, never called directly. It does
-- not need EXECUTE granted to anyone.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- ============================================================
-- A5 — policy performance
--
-- Bare auth.uid() and is_admin() are re-evaluated per row. Wrapping each in a
-- scalar subquery makes Postgres compute it once as an InitPlan. Same results,
-- same security — this is purely how often the function runs.
-- ============================================================

drop policy customers_select_own on public.customers;
create policy customers_select_own on public.customers
for select to authenticated
using (auth_id = (select auth.uid()) or (select public.is_admin()));

drop policy customers_update_own on public.customers;
create policy customers_update_own on public.customers
for update to authenticated
using (auth_id = (select auth.uid()))
with check (auth_id = (select auth.uid()));

drop policy orders_select_own on public.orders;
create policy orders_select_own on public.orders
for select to authenticated
using (
  (select public.is_admin())
  or customer_id in (
    select id from public.customers where auth_id = (select auth.uid())
  )
);

drop policy order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
for select to authenticated
using (
  (select public.is_admin())
  or order_id in (
    select o.id from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.auth_id = (select auth.uid())
  )
);

-- The admin-only tables call is_admin() once per row too.
drop policy payments_admin_read on public.payments;
create policy payments_admin_read on public.payments
for select to authenticated using ((select public.is_admin()));

drop policy farms_admin_read on public.farms;
create policy farms_admin_read on public.farms
for select to authenticated using ((select public.is_admin()));

drop policy produce_items_admin_read on public.produce_items;
create policy produce_items_admin_read on public.produce_items
for select to authenticated using ((select public.is_admin()));

drop policy purchases_admin_read on public.purchases;
create policy purchases_admin_read on public.purchases
for select to authenticated using ((select public.is_admin()));

-- ============================================================
-- Unindexed foreign keys
-- ============================================================

create index if not exists order_items_box_tier_idx
  on public.order_items (box_tier_id);
create index if not exists purchases_produce_item_idx
  on public.purchases (produce_item_id);
