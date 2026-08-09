-- Baseline: full schema as of 2026-08-03, read from project gftrbhnypvtharabxatm.
--
-- This squashes the 12 prior migrations (a v1 build, teardown_v1_schema, and the
-- v2 rebuild) into one file describing current state. Replaying the old history
-- had no value since v1 was dropped wholesale.
--
-- Captures the live database including AUTH-SETUP.md steps A1, A2, and A3, which
-- were already applied. A4 and A5 are NOT included here — they land in the next
-- migration.

-- ============================================================
-- Extensions and schemas
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- SECURITY DEFINER code lives here so it is never reachable over the Data API.
create schema if not exists private;

-- ============================================================
-- Enum types
-- ============================================================

create type public.fulfillment_kind as enum ('pickup', 'delivery');
create type public.order_status     as enum ('pending', 'confirmed', 'packed', 'fulfilled', 'cancelled');
create type public.payment_method   as enum ('card', 'cash', 'check', 'venmo', 'other');
create type public.payment_status   as enum ('unpaid', 'partial', 'paid', 'refunded');
create type public.time_window      as enum ('morning', 'afternoon', 'evening');

-- ============================================================
-- Sequences
-- ============================================================

-- Human-readable order numbers: SG-00001, SG-00002, …
create sequence public.order_number_seq start with 1 increment by 1;

-- ============================================================
-- Functions
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- NOTE: public.is_admin() is deliberately NOT defined here with the other
-- functions — it is defined further down, after the tables. See the comment at
-- its definition for why.

-- Belt-and-braces: any table created in `public` gets RLS turned on automatically.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- Creates the customers row when someone signs up. raw_user_meta_data is
-- user-editable — safe for a display name, never for authorization.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.customers (auth_id, name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New customer'
    ),
    new.email
  )
  on conflict do nothing;
  return new;
end;
$function$;

-- ============================================================
-- Tables
-- ============================================================

-- Sliding scale. Same box at every price — see BRAND.md §3.
create table public.box_tiers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price_cents integer not null check (price_cents > 0),
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  auth_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  email      text,
  phone      text,
  is_admin   boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null default ('SG-' || lpad(nextval('order_number_seq')::text, 5, '0')),
  -- Nullable: guest checkout is intended.
  customer_id        uuid references public.customers(id) on delete set null,
  contact_name       text not null,
  contact_email      text,
  contact_phone      text,
  fulfillment        public.fulfillment_kind not null,
  time_window        public.time_window,
  ship_street        text,
  ship_apt           text,
  ship_city          text,
  ship_state         text,
  ship_zip           text,
  dietary_notes      text,
  notes              text,
  subtotal_cents     integer not null default 0 check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents        integer not null default 0 check (total_cents >= 0),
  amount_paid_cents  integer not null default 0 check (amount_paid_cents >= 0),
  status             public.order_status not null default 'pending',
  payment_status     public.payment_status not null default 'unpaid',
  payment_method     public.payment_method,
  placed_at          timestamptz not null default now(),
  fulfilled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint orders_ship_state_check check (ship_state is null or char_length(ship_state) = 2),
  constraint orders_ship_zip_check   check (ship_zip is null or ship_zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  -- A delivery without an address is not a delivery.
  constraint orders_delivery_needs_address check (
    fulfillment <> 'delivery'::public.fulfillment_kind
    or (ship_street is not null and ship_city is not null
        and ship_state is not null and ship_zip is not null)
  )
);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  box_tier_id      uuid references public.box_tiers(id) on delete set null,
  description      text not null,
  quantity         integer not null check (quantity > 0 and quantity <= 20),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references public.orders(id) on delete cascade,
  method                   public.payment_method not null,
  amount_cents             integer not null,
  status                   text not null default 'succeeded',
  stripe_payment_intent_id text,
  stripe_event_id          text,
  check_number             text,
  received_at              timestamptz,
  deposited_at             timestamptz,
  collected_by             text,
  raw_payload              jsonb,
  created_at               timestamptz not null default now()
);

-- Named farms, not "locally sourced" — BRAND.md §3.
create table public.farms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  contact    text,
  notes      text,
  created_at timestamptz not null default now()
);

create table public.produce_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  default_unit text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.purchases (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid references public.farms(id) on delete set null,
  produce_item_id uuid references public.produce_items(id) on delete set null,
  purchase_date   date not null default current_date,
  description     text,
  quantity        numeric(12,3) check (quantity is null or quantity > 0),
  unit            text,
  cost_cents      integer not null default 0 check (cost_cents >= 0),
  invoice_ref     text,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- Functions that depend on the tables above
-- ============================================================

-- Defined here, not up with the other functions, because this body queries
-- public.customers. `language sql` bodies are validated at creation time
-- (check_function_bodies is on by default), so declaring it before that table
-- exists aborts with "relation customers does not exist" — invisible on an
-- already-built database, but it breaks every from-scratch `db reset`.
--
-- Called from inside RLS policies, so `authenticated` must retain EXECUTE.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from customers
    where auth_id = auth.uid() and is_admin
  );
$function$;

-- `create or replace function` resets the ACL, which re-grants EXECUTE to
-- PUBLIC (and anon inherits it). Keep this pair immediately after every
-- definition of is_admin() — see 20260803180000_is_admin_public_grant_regression.
revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;

-- ============================================================
-- Indexes
-- ============================================================

create unique index box_tiers_name_key   on public.box_tiers (lower(name));
create unique index box_tiers_price_key  on public.box_tiers (price_cents);
create index        box_tiers_active_idx on public.box_tiers (active) where active;

create unique index customers_auth_key  on public.customers (auth_id) where auth_id is not null;
create index        customers_email_idx on public.customers (lower(email));

create unique index orders_number_key         on public.orders (order_number);
create index        orders_customer_idx       on public.orders (customer_id);
create index        orders_status_idx         on public.orders (status);
create index        orders_payment_status_idx on public.orders (payment_status);
create index        orders_placed_at_idx      on public.orders (placed_at desc);

create index order_items_order_idx on public.order_items (order_id);

create index        payments_order_idx        on public.payments (order_id);
create unique index payments_stripe_event_key on public.payments (stripe_event_id)
  where stripe_event_id is not null;

create unique index farms_name_key         on public.farms (lower(name));
create unique index produce_items_name_key on public.produce_items (lower(name));

create index purchases_farm_idx on public.purchases (farm_id);
create index purchases_date_idx on public.purchases (purchase_date desc);

-- ============================================================
-- Triggers
-- ============================================================

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Postgres checks EXECUTE against the role doing the INSERT, which is the auth
-- service. Without these two grants every signup fails with a generic
-- "Database error saving new user".
revoke all on schema private from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();

-- ============================================================
-- Row level security
-- ============================================================

alter table public.box_tiers     enable row level security;
alter table public.customers     enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.payments      enable row level security;
alter table public.farms         enable row level security;
alter table public.produce_items enable row level security;
alter table public.purchases     enable row level security;

-- Prices are public — the order form renders them signed out.
create policy box_tiers_public_read on public.box_tiers
for select to anon, authenticated
using (active);

create policy customers_select_own on public.customers
for select to authenticated
using ((auth_id = auth.uid()) or is_admin());

create policy customers_update_own on public.customers
for update to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

create policy customers_insert_self on public.customers
for insert to authenticated
with check (auth_id = (select auth.uid()));

create policy orders_select_own on public.orders
for select to authenticated
using (
  is_admin()
  or customer_id in (select id from public.customers where auth_id = auth.uid())
);

create policy order_items_select_own on public.order_items
for select to authenticated
using (
  is_admin()
  or order_id in (
    select o.id from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.auth_id = auth.uid()
  )
);

create policy payments_admin_read      on public.payments      for select to authenticated using (is_admin());
create policy farms_admin_read         on public.farms         for select to authenticated using (is_admin());
create policy produce_items_admin_read on public.produce_items for select to authenticated using (is_admin());
create policy purchases_admin_read     on public.purchases     for select to authenticated using (is_admin());

-- ============================================================
-- Grants
--
-- RLS decides which rows; these decide whether the table is reachable at all.
-- Both are required.
-- ============================================================

grant select on public.box_tiers to anon, authenticated;

grant select on public.customers to authenticated;
-- Column-scoped on purpose. A blanket UPDATE grant lets a signed-in user set
-- is_admin on their own row and take over every admin-gated table, because RLS
-- cannot restrict which *columns* an UPDATE touches.
grant update (name, email, phone) on public.customers to authenticated;

grant select on public.orders        to authenticated;
grant select on public.order_items   to authenticated;
grant select on public.payments      to authenticated;
grant select on public.farms         to authenticated;
grant select on public.produce_items to authenticated;
grant select on public.purchases     to authenticated;

-- ============================================================
-- Seed
-- ============================================================

-- $5 to $30, and everybody's box is the same box.
insert into public.box_tiers (name, price_cents, sort_order) values
  ('$5 Box',   500, 1),
  ('$10 Box', 1000, 2),
  ('$15 Box', 1500, 3),
  ('$20 Box', 2000, 4),
  ('$25 Box', 2500, 5),
  ('$30 Box', 3000, 6)
on conflict do nothing;
