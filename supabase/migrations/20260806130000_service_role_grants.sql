-- ============================================================
-- Grant table privileges to service_role.
--
-- No migration has ever done this. On the hosted project it did not matter:
-- Supabase seeds these grants when a project is created, so service_role has
-- had them all along. A database built purely from these migrations — i.e. any
-- local `supabase db reset` — does not, and the service-role client fails with
--
--   42501: permission denied for table customers
--   HINT:  GRANT SELECT ON public.customers TO service_role;
--
-- That breaks deleteAccount (app/My-Account/actions.ts), which is precisely the
-- flow the local stack exists to test.
--
-- Same class of bug as the is_admin() ordering fix: invisible on an
-- incrementally-built database, fatal on a from-scratch replay.
--
-- SAFE ON PRODUCTION: granting a privilege that is already held is a no-op.
--
-- Note this does NOT weaken anything. service_role bypasses RLS by design and
-- is server-only (lib/supabase/admin.ts is marked `server-only`, and the key is
-- SUPABASE_SERVICE_ROLE_KEY, never NEXT_PUBLIC_). These grants restore the
-- privileges Supabase itself provisions; they do not hand anything to anon or
-- authenticated.
-- ============================================================

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select
  on all sequences in schema public
  to service_role;

-- Tables added by later migrations would otherwise miss out and reintroduce
-- the same failure. `for role postgres` matters: default privileges apply to
-- objects created BY a given role, and migrations run as postgres.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
