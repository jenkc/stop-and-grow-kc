import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. **Bypasses RLS entirely.**
 *
 * `import 'server-only'` is the guard that matters here: it makes the build
 * fail rather than silently shipping this key to the browser if a Client
 * Component ever imports it, directly or through a chain. The key is read from
 * SUPABASE_SERVICE_ROLE_KEY, deliberately not NEXT_PUBLIC_ — anything with that
 * prefix is inlined into client bundles.
 *
 * Only reach for this when the operation genuinely cannot be done as the user:
 * right now that is deleting an auth.users row, which the Admin API requires.
 * Everything else should use lib/supabase/server.ts so RLS still applies.
 *
 * Because RLS is off for this client, every query it makes must carry its own
 * ownership filter. There is no policy behind it to catch a missing `.eq()`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Fail loudly at the call site. Without this, a missing key surfaces later as
  // a confusing 401 from PostgREST rather than a configuration problem.
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      // No session to persist or refresh — this client acts as the service
      // role, never as a user, and it is constructed per request.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
