'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminEmail } from '@/lib/access'
import { createClient } from '@/lib/supabase/server'

/**
 * Where a plain login lands when no destination was requested — admins on the
 * screen they actually came for, everyone else on the order form.
 *
 * An explicit `next` always wins over both. Someone bounced off /My-Account by
 * the proxy lands back on /My-Account, admin or not; overriding that would break
 * every deep link and bookmark into a protected page.
 */
const ADMIN_FALLBACK = '/Admin'
const CUSTOMER_FALLBACK = '/Order'

/**
 * Only same-site relative paths are allowed as a post-login destination.
 *
 * `next` reaches us through a hidden form field, so it is attacker-influencable
 * exactly like the query param in app/auth/confirm/route.ts — a crafted link to
 * /Login?next=https://evil.example is an open redirect if we trust it.
 *
 * That route resolves against getSiteUrl() because NextResponse.redirect()
 * needs an absolute URL. redirect() in a Server Action takes a relative path,
 * so we can reject anything that is not one and skip origin resolution
 * entirely.
 *
 * Rejected shapes:
 *   "https://evil.example"  — absolute, different origin
 *   "//evil.example"        — protocol-relative; the browser reads this as a
 *                             host, and it is the classic miss in naive
 *                             "starts with /" checks
 *   "/\evil.example"        — backslash; some browsers normalize \ to /
 */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return CUSTOMER_FALLBACK
  if (!value.startsWith('/')) return CUSTOMER_FALLBACK
  if (value.startsWith('//') || value.startsWith('/\\')) return CUSTOMER_FALLBACK
  return value
}

/**
 * Post-login destination.
 *
 * A requested `next` short-circuits: it is honored (once safeNext has vetted it)
 * without asking who the user is. Only when the field is absent — a plain login
 * from the nav, where the form omits it entirely — do we pay for an is_admin()
 * round trip to choose between /Admin and /Order.
 *
 * getAdminEmail() is the same function app/Admin/layout.tsx gates on, so there is
 * no second notion of "admin" here to drift out of sync. It never throws.
 */
async function destinationFor(next: FormDataEntryValue | null): Promise<string> {
  if (typeof next === 'string') return safeNext(next)
  return (await getAdminEmail()) ? ADMIN_FALLBACK : CUSTOMER_FALLBACK
}

export async function login(_prev: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  // Make a data pass-through to the client, so it can display a message.

  // Flat and specific enough to act on, without confirming which addresses
  // have accounts.
  if (error) return { error: 'That email and password do not match an account.' }

  // '/' with type 'layout' invalidates the root layout and everything nested
  // under it — the whole app. The session cookie just changed, so every cached
  // signed-out render has to go. No per-route call needed.
  revalidatePath('/', 'layout')
  // `next` is set by the proxy when it bounces someone off a protected route,
  // and passed through by the login form's hidden field. Absent means no
  // preference, which is when admin status decides.
  //
  // Resolved BEFORE redirect(): redirect() unwinds by throwing, so awaiting
  // inside its argument list is fine, but wrapping it in anything that catches
  // would swallow the navigation.
  const destination = await destinationFor(formData.get('next'))
  redirect(destination)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  // Land on Login rather than '/': someone who just signed out is often about
  // to sign back in, and the page already renders ?error= messages so the
  // confirmation slots into the same pattern.
  redirect('/Login?signedout=1')
}