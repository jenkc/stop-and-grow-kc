import 'server-only'
import { headers } from 'next/headers'

/**
 * Hosts we will trust from an inbound request. An origin is only honored if its
 * host is in here — otherwise a forged Origin/Host header could put an
 * attacker-controlled domain into a confirmation email we send to a real user.
 *
 * `localhost` and `127.0.0.1` are NOT interchangeable to Supabase's redirect
 * allowlist. Both are listed here and both belong in the dashboard.
 *
 * EXTRA_ALLOWED_HOSTS exists for the Vercel move: a deploy is reachable at its
 * own *.vercel.app hostname before DNS points at it, and a signup started there
 * would otherwise build its confirmation link from PRODUCTION_FALLBACK — a
 * domain that may still be pointing at the old origin mid-cutover, which is how
 * a confirmation email leads nowhere and an admin cannot finish signing up.
 *
 * Comma-separated, host[:port] only — no scheme, no path. Setting it is
 * deliberate: it stays an allowlist, and an unset var changes nothing. Whatever
 * goes here must ALSO be added to Supabase's own redirect allowlist, or the
 * link is rejected at their end instead of ours.
 */
const ALLOWED_HOSTS = new Set([
  'localhost:3000',
  '127.0.0.1:3000',
  'stopandgrowkc.org',
  'www.stopandgrowkc.org',
  ...(process.env.EXTRA_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
])

/** Last resort when no header matches and the env var is unset. */
const PRODUCTION_FALLBACK = 'https://stopandgrowkc.org'

/**
 * www and apex are separate entries to Supabase. Collapsing to apex means the
 * allowlist carries one production pattern, and a signup started on www still
 * produces a link that matches it.
 */
function normalizeHost(host: string): string {
  return host === 'www.stopandgrowkc.org' ? 'stopandgrowkc.org' : host
}

function schemeFor(host: string): 'http' | 'https' {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
    ? 'http'
    : 'https'
}

/**
 * Public base URL for the current request, e.g. "http://localhost:3000" or
 * "https://stopandgrowkc.org". No trailing slash.
 */
export async function getSiteUrl(): Promise<string> {
  const h = await headers()

  // 1. Origin. Browsers send this on same-origin POSTs, which is what a Server
  //    Action is — so this branch normally resolves it. Parse rather than
  //    string-match, so "https://evil.com/?x=localhost:3000" can't sneak by.
  const origin = h.get('origin')
  if (origin) {
    try {
      const host = normalizeHost(new URL(origin).host)
      if (ALLOWED_HOSTS.has(host)) return `${schemeFor(host)}://${host}`
    } catch {
      // Malformed Origin — fall through.
    }
  }

  // 2. Forwarded headers. cloudflared connects to 127.0.0.1:3000, so `host`
  //    arrives as loopback over plain HTTP; the real public hostname survives
  //    only in x-forwarded-host. This is the net for a tunneled request that
  //    carries no Origin.
  const forwardedHost = h.get('x-forwarded-host')
  if (forwardedHost) {
    const host = normalizeHost(forwardedHost.split(',')[0].trim())
    if (ALLOWED_HOSTS.has(host)) {
      const proto = h.get('x-forwarded-proto')?.split(',')[0].trim()
      const scheme = proto === 'http' || proto === 'https' ? proto : schemeFor(host)
      return `${scheme}://${host}`
    }
  }

  // 3. Plain host header — a direct localhost hit with no Origin.
  const hostHeader = h.get('host')
  if (hostHeader) {
    const host = normalizeHost(hostHeader.trim())
    if (ALLOWED_HOSTS.has(host)) return `${schemeFor(host)}://${host}`
  }

  // 4 & 5. Nothing trustworthy on the request.
  return (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_FALLBACK).replace(/\/+$/, '')
}
