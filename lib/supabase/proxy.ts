import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

/**
 * Routes that require a signed-in user. Everything else is public on purpose —
 * ordering a box does not require an account.
 *
 * Casing matters: the folders under app/ are PascalCase, so these must be too.
 */
const PROTECTED_PREFIXES = ['/My-Account', '/Admin']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, don't put this client in a global variable.
  // Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not put code between createServerClient and getClaims(). A mistake here
  // makes users log out at random, and it is miserable to debug.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const { pathname } = request.nextUrl
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (!user && needsAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/Login'
    url.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(url)
    // Carry the refreshed auth cookies onto the redirect, or the browser and
    // server fall out of sync and the session dies early.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  // Must be returned as-is. If you build a different response, copy the cookies
  // across first.
  return supabaseResponse
}