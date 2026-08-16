import 'server-only'
import { headers } from 'next/headers'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createClient } from '@/lib/supabase/server'

/**
 * Who is allowed to see /Admin.
 *
 * Two strategies behind one function, because the deployment target is moving.
 * Today the site is served through a Cloudflare Tunnel and Cloudflare Access is
 * the outer gate; on Vercel that stops being viable — the origin becomes public,
 * so the *.vercel.app URL would route around Access entirely, and the fixes for
 * that (Authenticated Origin Pull, Trusted IPs) are unavailable on managed hosts
 * or Enterprise-only. Callers depend on getAdminEmail() alone, so that migration
 * is a change to this file and nothing else.
 *
 * Precedence, first match wins:
 *   1. Cloudflare Access JWT present -> verify it, trust its email claim.
 *   2. No Access header at all       -> Supabase session + is_admin().
 *
 * The asymmetry in (1) is the security-critical part: a header that is *absent*
 * falls through to (2), but a header that is *present and invalid* returns null
 * immediately. The app listens on 127.0.0.1:3000, so anyone who can reach that
 * port can send whatever headers they like. If a bad token fell through, an
 * attacker could strip themselves down to the weaker check by sending garbage.
 * Reject instead.
 *
 * Note this deliberately keeps customers.is_admin as an authorization input, so
 * the Access policy and the database flag are two lists that must be kept in
 * sync by hand (_Documents/GRANT-ADMIN.sql section 3). That is the price of
 * portability and it is temporary — once the tunnel is retired, strategy 1 goes
 * away and is_admin becomes the single source of truth.
 */

const TEAM_DOMAIN = 'https://stopandgrowkc.cloudflareaccess.com'

/**
 * Hoisted on purpose. createRemoteJWKSet caches the key set and handles the
 * six-week rotation; building it per request would refetch every time.
 */
const JWKS = createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`))

/**
 * Email of the current admin, or null. Never throws — a failure here is a
 * redirect, not a 500.
 */
export async function getAdminEmail(): Promise<string | null> {
  const h = await headers()
  const token = h.get('cf-access-jwt-assertion')

  // 1. Cloudflare Access. The aud tag pins verification to THIS application —
  //    without it a token minted for any other app in the account would verify
  //    here, so an unset CF_ACCESS_AUD means we skip the strategy rather than
  //    run a check that only looks like one.
  const aud = process.env.CF_ACCESS_AUD
  if (token && aud) {
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: TEAM_DOMAIN,
        audience: aud,
      })

      const email = payload.email
      if (typeof email !== 'string' || !email) {
        console.error('[access] verified token carried no email claim')
        return null
      }

      return email.toLowerCase()
    } catch (err) {
      // Present but bad. Do NOT fall through to the Supabase check.
      console.error('[access] JWT rejected:', err)
      return null
    }
  }

  if (token && !aud) {
    console.warn('[access] CF_ACCESS_AUD unset — ignoring Access header')
    return null
  }

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