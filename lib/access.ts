import 'server-only'
import { createClient } from '@/lib/supabase/server'

/*
 * Who is allowed to see /Admin.
 *
 * The Supabase session plus the is_admin() RPC — customers.is_admin is the
 * single source of truth. Cloudflare Access was the outer gate while the site
 * was served through a tunnel; it was removed when the site moved to Vercel,
 * where the origin is public and Access could be routed around entirely.
 *
 * Callers depend on getAdminEmail() alone, which is why that migration was a
 * change to this file and nothing else.
 *
 * This gates RENDERING. Every Server Action re-checks independently — an action
 * is a public POST endpoint that never passes through the /Admin layout, and all
 * admin writes use the service role, which bypasses RLS. See app/Admin/actions.ts.
 */


/*
 * Email of the current admin, or null. Never throws — a failure here is a
 * redirect, not a 500.
 */
export async function getAdminEmail(): Promise<string | null> {

  // 2. No Access header. Either local development or a future Vercel
  //    deployment. proxy.ts has already established there is a session by the
  //    time /Admin renders; this decides whether it is an admin session.
  try {
    const supabase = await createClient()

    const { data: claims } = await supabase.auth.getClaims()
    const email = claims?.claims?.email
    if (typeof email !== 'string' || !email) return null

    const { data: isAdmin, error } = await supabase.rpc('is_admin')
    if (error) {
      console.error('[access] is_admin rpc failed:', error)
      return null
    }

    return isAdmin ? email.toLowerCase() : null
  } catch (err) {
    console.error('[access] supabase admin check threw:', err)
    return null
  }
}