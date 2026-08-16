-- ============================================================
-- Distribution cycles and delivery windows.
--
-- WHY
-- orders.time_window is an enum: morning | afternoon | evening. Scraps' actual
-- notes say "10-12:30" and "4-6". The enum cannot express those, and she sets
-- different times most weeks, so this is not a matter of adding more values.
--
-- A cycle is one week: the Wednesday farm pickup, the Thursday/Friday
-- deliveries, and the ordering window in between. Windows hang off the cycle
-- and are entered fresh each week — deliberately NOT templated, because the
-- times genuinely vary.
--
-- WHAT OPENS ORDERING
-- distribution_cycles.status is the switch Scraps flips (draft -> open ->
-- closed). orders_open_at / orders_close_at are nullable and, when set, narrow
-- the window further. Null means "manual only", which is where this starts.
-- Keeping both means scheduling can be turned on later without a migration,
-- and the same single gate in placeOrder() later carries the order-total cap
-- described in .agents/HANDOFF.md (2026-08-06).
--
-- orders.time_window IS DELIBERATELY LEFT IN PLACE.
-- Adding a replacement and dropping the original in one migration means any
-- row written between deploy and backfill loses its window. window_id lands
-- here; time_window gets dropped in a later migration once nothing reads it.
-- ============================================================

-- ---------- cycle status ----------
-- 'fulfilled' is distinct from 'closed': closed means no new orders, fulfilled
-- means the week is delivered and done. Scraps closes ordering Thursday and
-- delivers Friday, so the two are days apart.
create type public.cycle_status as enum ('draft', 'open', 'closed', 'fulfilled');

create table public.distribution_cycles (
  id              uuid primary key default gen_random_uuid(),
  cycle_date      date not null,
  title           text,
  status          public.cycle_status not null default 'draft',
  -- Both nullable: null = "this cycle is governed by status alone."
  orders_open_at  timestamptz,
  orders_close_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint distribution_cycles_window_order check (
    orders_open_at is null
    or orders_close_at is null
    or orders_close_at > orders_open_at
  )
);

-- One cycle per date. Two open cycles for the same week is a data-entry
-- mistake, and the "current cycle" lookup would have to guess between them.
create unique index distribution_cycles_cycle_date_key
  on public.distribution_cycles (cycle_date);

create table public.delivery_windows (
  id         uuid primary key default gen_random_uuid(),
  cycle_id   uuid not null references public.distribution_cycles(id) on delete cascade,
  -- Reuses the existing enum: a window is for pickup or for delivery, and the
  -- order form shows only the list matching what the visitor chose.
  kind       public.fulfillment_kind not null,
  -- What Scraps types and what everyone reads: "10:00-12:30pm".
  label      text not null,
  -- What the runsheet sorts by. Sorting on `label` would order "10:00-12:30pm"
  -- before "4-6pm" — string order, not clock order. Store both.
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  capacity   integer check (capacity is null or capacity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint delivery_windows_time_order check (ends_at > starts_at)
);

create index delivery_windows_cycle_id_idx on public.delivery_windows (cycle_id);
create index delivery_windows_sort_idx     on public.delivery_windows (cycle_id, kind, starts_at);

-- ---------- orders.window_id ----------
-- on delete set null, matching orders.customer_id: deleting a window must not
-- delete the orders that referenced it.
alter table public.orders
  add column window_id uuid references public.delivery_windows(id) on delete set null;

create index orders_window_id_idx on public.orders (window_id);

-- ---------- updated_at ----------
create trigger distribution_cycles_set_updated_at
  before update on public.distribution_cycles
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- rls_auto_enable (baseline) turns RLS on for new public tables via event
-- trigger. Stated explicitly anyway: this is a security boundary, and it should
-- be readable here rather than inferred from a trigger defined 300 lines away.
alter table public.distribution_cycles enable row level security;
alter table public.delivery_windows    enable row level security;

-- The order form renders before anyone signs in, so anon must be able to read
-- the current cycle and its windows. Only 'open' cycles are visible: a draft
-- cycle is Scraps' scratch space and must not leak next week's plan, and a
-- closed one must not offer windows the form would then reject.
create policy distribution_cycles_public_read on public.distribution_cycles
  for select to anon, authenticated
  using (status = 'open');

create policy delivery_windows_public_read on public.delivery_windows
  for select to anon, authenticated
  using (exists (
    select 1 from public.distribution_cycles c
    where c.id = delivery_windows.cycle_id
      and c.status = 'open'
  ));

-- Admins read every cycle regardless of status — /Admin/Cycle edits drafts.
create policy distribution_cycles_admin_read on public.distribution_cycles
  for select to authenticated using (public.is_admin());

create policy delivery_windows_admin_read on public.delivery_windows
  for select to authenticated using (public.is_admin());

-- ---------- grants ----------
-- No INSERT/UPDATE/DELETE to anon or authenticated, by the same reasoning as
-- 20260806140000_orders_server_only_writes.sql: the publishable key ships to
-- every browser, so a client-writable cycle table means anyone can open
-- ordering or invent a window. All writes go through service-role Server
-- Actions in app/Admin/actions.ts.
grant select on public.distribution_cycles to anon, authenticated;
grant select on public.delivery_windows    to anon, authenticated;

grant select, insert, update, delete on public.distribution_cycles to service_role;
grant select, insert, update, delete on public.delivery_windows    to service_role;