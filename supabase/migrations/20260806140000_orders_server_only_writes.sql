-- ============================================================
-- Close the free-order hole: no client-facing role may INSERT into orders.
--
-- THE BUG
-- 20260803170000_order_insert_policies.sql granted INSERT on orders and
-- order_items to `anon` and `authenticated`, gated by owns_customer(). That
-- check only constrains customer_id — it says nothing about money. Since
-- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ships to every browser, anyone could:
--
--   POST /rest/v1/orders
--   {"total_cents":0,"payment_status":"paid","status":"confirmed", ...}
--
-- and get a free order marked paid. Verified against a local database before
-- this migration: it returned 201 Created.
--
-- This is not fixable with a better WITH CHECK. The client controls every
-- column in the row it sends, so any policy permitting client INSERT permits a
-- client-chosen price. PHASE-1.md says so directly ("No WITH CHECK prevents
-- this") and specifies the architecture: writes go through the server, RLS
-- protects reads.
--
-- THE FIX
-- Orders are written only by placeOrder() (app/Order/actions.ts) using the
-- service-role client, which validates server-side: price is read from
-- box_tiers, quantity is bounded, and identity comes from the session rather
-- than the form. Nothing customer-facing can write an order row.
--
-- Reads are untouched. orders_select_own / order_items_select_own still let a
-- signed-in customer see their own orders under RLS.
-- ============================================================

-- ---------- insert policies: gone ----------
-- Dropped rather than narrowed. A policy that exists invites someone to widen
-- it later; absence is the clearer statement.
drop policy if exists orders_insert_own      on public.orders;
drop policy if exists order_items_insert_own on public.order_items;

-- ---------- guest read-back: no longer needed ----------
-- These existed only so .insert().select() (which compiles to RETURNING) could
-- read back a just-created guest order. The service-role client bypasses RLS,
-- so the RETURNING works without them — and they were the only thing letting an
-- anonymous caller SELECT an order at all.
drop policy if exists orders_select_guest_insert      on public.orders;
drop policy if exists order_items_select_guest_insert on public.order_items;

-- ---------- grants ----------
-- RLS decides which rows; grants decide whether the table is reachable at all.
-- Removing the grant means a client-side INSERT fails at the privilege layer,
-- before any policy is consulted — defence in depth, not belt-and-braces.
revoke insert on public.orders      from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;

-- anon has no legitimate reason to SELECT orders now that the read-back window
-- is gone. authenticated keeps SELECT: orders_select_own scopes it to their own
-- rows, which is what /My-Account renders.
revoke select on public.orders      from anon;
revoke select on public.order_items from anon;

-- order_number defaults to nextval(). Only the writer needs the sequence, and
-- the writer is now service_role.
revoke usage on sequence public.order_number_seq from anon, authenticated;
grant  usage on sequence public.order_number_seq to service_role;

-- box_tiers stays readable: the order form renders the catalog before anyone
-- signs in, and box_tiers_public_read already limits it to active rows.

-- ---------- owns_customer ----------
-- Still used by policies on other tables, so the function stays. But anon no
-- longer calls it — the insert policies that needed it are gone.
revoke execute on function public.owns_customer(uuid) from anon;
