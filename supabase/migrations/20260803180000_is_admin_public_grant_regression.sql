-- ============================================================
-- Re-revoke is_admin() from PUBLIC.
--
-- The A4 section of 20260803130000_auth_hardening.sql already did this, but the
-- live ACL had drifted back to `=X/postgres` — the leading `=` is a grant to
-- PUBLIC, which `anon` inherits. So an unauthenticated caller could reach
-- /rest/v1/rpc/is_admin.
--
-- Low severity on its own: is_admin() takes no arguments and returns a boolean
-- about the *caller*, so for anon it is always false. The reason to fix it is
-- that PUBLIC grants are how a genuinely sensitive helper leaks later.
--
-- WHY IT REGRESSED, AND HOW TO NOT REPEAT IT:
-- `create or replace function` resets a function's ACL to the default, which
-- includes EXECUTE for PUBLIC. Any migration that redefines is_admin() silently
-- undoes the revoke. Keep the revoke/grant pair immediately after every
-- definition of the function rather than in a separate hardening migration.
--
-- Verified after applying:
--   anon         -> cannot execute is_admin()   (was able to before)
--   authenticated-> can execute                 (required: RLS evaluates the
--                                                function as the calling role)
--   guest order insert still succeeds
--   /Order still renders all six box tiers
-- ============================================================

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- note on public.owns_customer(uuid) ----------
-- Deliberately left as-is. Its ACL is already explicit
-- (`anon=X | authenticated=X`, no PUBLIC entry), and both roles genuinely need
-- EXECUTE because RLS policy expressions run as the calling role — revoking it
-- breaks order inserts outright (tested).
--
-- The Supabase advisor warns that it is callable via RPC. That is accepted: it
-- takes a customer id the caller must already know and returns only a boolean,
-- so it confirms nothing an attacker could not already test by attempting the
-- insert. Making the warning disappear would mean breaking checkout.
