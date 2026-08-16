-- ============================================================
-- Local development seed. Runs after migrations on `supabase db reset`.
--
-- LOCAL ONLY. This creates a user with a known password. It is never applied
-- to the hosted project — `db reset` targets the local stack, and `db push`
-- only sends migrations, not this file.
--
-- box_tiers are NOT seeded here: the baseline migration already inserts the
-- $5–$30 boxes, so the order form has options straight after a reset.
-- ============================================================

-- ---------- test account ----------
-- Log in with: test@example.com / password123
--
-- Inserting into auth.users fires private.handle_new_user(), which creates the
-- matching public.customers row — the same path a real signup takes, so the
-- seeded account behaves like a genuine one rather than a special case.
--
-- email_confirmed_at is set so the account is immediately usable. (config.toml
-- sets enable_confirmations = false locally, so signups through the UI skip
-- confirmation too; this just makes the seeded user consistent with that.)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  -- These five must be '' and not NULL. GoTrue scans them into Go `string`,
  -- which cannot hold NULL, so a seeded user missing them fails every login
  -- with a 500 "Database error querying schema" and the real cause only
  -- visible in the auth container log:
  --   Scan error on column index 3, name "confirmation_token":
  --   converting NULL to string is unsupported
  -- The columns are nullable in the schema, so nothing catches this until an
  -- actual sign-in is attempted.
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test@example.com',
  -- bcrypt of 'password123', generated rather than pasted as an opaque blob.
  --
  -- Schema-qualified deliberately: the baseline migration installs pgcrypto
  -- `with schema extensions`, which is NOT on the default search_path. Calling
  -- gen_salt() unqualified fails with "function gen_salt(unknown) does not
  -- exist" — verified against a scratch Postgres, not assumed.
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Customer"}',
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- An identity row is what makes password sign-in work. Without it GoTrue finds
-- the user but has no email identity to authenticate against.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"test@example.com","email_verified":true,"phone_verified":false}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

-- Give the seeded profile a phone number, so /My-Account renders a populated
-- summary rather than three em-dashes. name/email came from the trigger.
update public.customers
   set phone = '816-555-0142'
 where auth_id = '11111111-1111-1111-1111-111111111111';

-- ---------- the week ----------
-- An open cycle with real-shaped windows. Without this /Order renders "Ordering
-- is closed" and the admin screens have nothing to group by, so a fresh local
-- database would look broken rather than empty.
--
-- Times are relative to now() so the seed does not rot into a date in the past.
-- Labels are free text on purpose — this is exactly the shape of Scraps' own
-- notes ("10-12:30", "4-6"), which the morning/afternoon/evening enum could not
-- express.
insert into public.distribution_cycles (id, cycle_date, title, status)
values (
  'c0000000-0000-4000-8000-000000000001',
  (now() + interval '3 days')::date,
  'Sample week',
  'open'
)
on conflict (id) do nothing;

insert into public.delivery_windows (id, cycle_id, kind, label, starts_at, ends_at, sort_order)
values
  ('c0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001',
   'delivery', '10:00–12:30pm',
   (now() + interval '3 days')::date + time '10:00',
   (now() + interval '3 days')::date + time '12:30', 1),
  ('c0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001',
   'delivery', '4–6pm',
   (now() + interval '3 days')::date + time '16:00',
   (now() + interval '3 days')::date + time '18:00', 2),
  ('c0000000-0000-4000-8000-00000000000c', 'c0000000-0000-4000-8000-000000000001',
   'pickup', '11am–1pm',
   (now() + interval '3 days')::date + time '11:00',
   (now() + interval '3 days')::date + time '13:00', 1)
on conflict (id) do nothing;

-- ---------- sample orders ----------
-- One account order and one guest order, so /My-Account has content and the
-- guest/account split has something to report on.
--
-- checkout_method is set via a lateral lookup against the column's existence:
-- this file has to work both before and after the checkout_method migration is
-- applied. Once that migration is deployed everywhere, the DO block can be
-- replaced with plain inserts that name the column directly.
do $$
declare
  cust_id uuid;
  has_method boolean;
  order_a uuid;
  order_b uuid;
  order_c uuid;
  order_d uuid;
  order_e uuid;
begin
  select id into cust_id
    from public.customers
   where auth_id = '11111111-1111-1111-1111-111111111111';

  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'checkout_method'
  ) into has_method;

  -- Signed-in order, fulfilled and paid.
  insert into public.orders (
    customer_id, contact_name, contact_email, contact_phone,
    fulfillment, window_id, subtotal_cents, total_cents, amount_paid_cents,
    status, payment_status, placed_at
  ) values (
    cust_id, 'Test Customer', 'test@example.com', '816-555-0142',
    'pickup', 'c0000000-0000-4000-8000-00000000000c', 2000, 2000, 2000,
    'fulfilled', 'paid', now() - interval '9 days'
  ) returning id into order_a;

  insert into public.order_items (
    order_id, description, quantity, unit_price_cents, line_total_cents
  ) values (order_a, '$20 Box', 1, 2000, 2000);

  -- Guest order: customer_id null, contact details on the order itself.
  -- window_id rather than time_window — the enum is superseded and left null.
  insert into public.orders (
    customer_id, contact_name, contact_email, contact_phone,
    fulfillment, window_id, ship_street, ship_city, ship_state, ship_zip,
    dietary_notes, subtotal_cents, total_cents,
    status, payment_status, placed_at
  ) values (
    null, 'Walk-in Guest', 'guest@example.com', '816-555-0199',
    'delivery', 'c0000000-0000-4000-8000-00000000000a',
    '123 Main St', 'Kansas City', 'MO', '64111',
    'No celery or beets', 1000, 1000,
    'pending', 'unpaid', now() - interval '2 days'
  ) returning id into order_b;

  insert into public.order_items (
    order_id, description, quantity, unit_price_cents, line_total_cents
  ) values (order_b, '$10 Box', 1, 1000, 1000);

  -- Three more so the admin screens have something to group, sort and reconcile:
  -- a second delivery window, a packed-but-unpaid stop, and a cancelled order
  -- that must appear in the records while staying off the runsheet.
  insert into public.orders (
    customer_id, contact_name, contact_phone,
    fulfillment, window_id, ship_street, ship_city, ship_state, ship_zip,
    subtotal_cents, total_cents, status, payment_status, placed_at
  ) values (
    null, 'Maria Delgado', '816-555-0142',
    'delivery', 'c0000000-0000-4000-8000-00000000000b',
    '4312 Walnut St', 'Kansas City', 'MO', '64111',
    2500, 2500, 'packed', 'unpaid', now() - interval '1 day'
  ) returning id into order_c;

  insert into public.order_items (
    order_id, description, quantity, unit_price_cents, line_total_cents
  ) values (order_c, '$25 Box', 1, 2500, 2500);

  insert into public.orders (
    customer_id, contact_name, contact_phone,
    fulfillment, window_id, dietary_notes,
    subtotal_cents, total_cents, status, payment_status, placed_at
  ) values (
    null, 'Priya Raman', null,
    'pickup', 'c0000000-0000-4000-8000-00000000000c', 'Allergic to peanuts',
    1500, 1500, 'pending', 'unpaid', now() - interval '6 hours'
  ) returning id into order_d;

  insert into public.order_items (
    order_id, description, quantity, unit_price_cents, line_total_cents
  ) values (order_d, '$15 Box', 1, 1500, 1500);

  insert into public.orders (
    customer_id, contact_name, contact_phone,
    fulfillment, window_id, ship_street, ship_city, ship_state, ship_zip,
    subtotal_cents, total_cents, status, payment_status, placed_at
  ) values (
    null, 'Cancelled Order', '816-555-0100',
    'delivery', 'c0000000-0000-4000-8000-00000000000b',
    '1 Nowhere Ln', 'Kansas City', 'MO', '64111',
    2000, 2000, 'cancelled', 'unpaid', now() - interval '3 days'
  ) returning id into order_e;

  insert into public.order_items (
    order_id, description, quantity, unit_price_cents, line_total_cents
  ) values (order_e, '$20 Box', 1, 2000, 2000);

  if has_method then
    -- The cast is required, not decorative: checkout_method is an enum, and a
    -- USING parameter arrives as text. Postgres will not coerce text -> enum
    -- implicitly in a parameterized statement ("column is of type
    -- checkout_method but expression is of type text").
    execute 'update public.orders set checkout_method = $1::public.checkout_method where id = $2'
      using 'account', order_a;
    execute 'update public.orders set checkout_method = $1::public.checkout_method where id = $2'
      using 'guest', order_b;
  end if;
end $$;
