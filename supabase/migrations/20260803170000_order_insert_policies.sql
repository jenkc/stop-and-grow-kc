-- ============================================================
-- Let customers actually place orders.
--
-- orders/order_items had SELECT policies but no INSERT, so every order write
-- was rejected by RLS. This adds the INSERT path for both signed-in and guest
-- checkout.
--
-- Guest checkout: orders.customer_id is nullable and the table carries its own
-- contact_name/email/phone, so a guest order is simply one with a null
-- customer_id.
--
-- This file is the consolidated form of what was applied to the hosted project
-- across migrations order_insert_policies, order_insert_returning_grants,
-- order_policies_avoid_customers_grant, and order_number_seq_grant.
-- ============================================================

-- ---------- ownership helper ----------
-- Answers only "is this customer id mine?" — nothing else. SECURITY DEFINER so
-- the check can read public.customers without granting anon SELECT on a table
-- of names, emails and phone numbers.
create or replace function public.owns_customer(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select cid is null
      or exists (
           select 1 from public.customers c
           where c.id = cid and c.auth_id = auth.uid()
         );
$$;

-- RLS policy expressions run as the calling role, so anon/authenticated need
-- EXECUTE here. Revoking it breaks order inserts (verified).
grant execute on function public.owns_customer(uuid) to anon, authenticated;

-- ---------- insert policies ----------
-- Signed-in: the order must point at your own customer row. Guest: customer_id
-- must be null, so an anonymous caller can never write into a real customer's
-- order history.
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert to anon, authenticated
  with check (public.owns_customer(customer_id));

drop policy if exists order_items_insert_own on public.order_items;
create policy order_items_insert_own on public.order_items
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.owns_customer(o.customer_id)
    )
  );

-- ---------- guest read-back ----------
-- The order action uses .insert().select(...), which compiles to RETURNING and
-- therefore needs SELECT. Guests have no customer row, so orders_select_own
-- never matches for them; this narrow window lets them read back only the row
-- they just created. Signed-in users are unaffected — their own policy applies.
drop policy if exists orders_select_guest_insert on public.orders;
create policy orders_select_guest_insert on public.orders
  for select to anon
  using (customer_id is null and placed_at > now() - interval '1 minute');

drop policy if exists order_items_select_guest_insert on public.order_items;
create policy order_items_select_guest_insert on public.order_items
  for select to anon
  using (
    order_id in (
      select o.id from public.orders o
      where o.customer_id is null
        and o.placed_at > now() - interval '1 minute'
    )
  );

-- ---------- grants ----------
-- RLS decides which rows; grants decide whether the table is reachable at all.
-- Both are required. Deliberately no UPDATE/DELETE — editing an order is an
-- admin action and is not exposed to customers here.
grant insert, select on public.orders to anon, authenticated;
grant insert, select on public.order_items to anon, authenticated;
grant select on public.box_tiers to anon, authenticated;

-- orders.order_number defaults to nextval('order_number_seq').
grant usage on sequence public.order_number_seq to anon, authenticated;

-- Guests need the catalog to render the form.
do $$
begin
  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'box_tiers'
      and p.polname = 'box_tiers_public_read'
  ) then
    create policy box_tiers_public_read on public.box_tiers
      for select to anon, authenticated using (active);
  end if;
end $$;

-- order_items.order_id is walked by both the select and insert policies.
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
