'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Where a plain login lands when no destination was requested. */
const FALLBACK_NEXT = '/Order'

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
  if (typeof value !== 'string') return FALLBACK_NEXT
  if (!value.startsWith('/')) return FALLBACK_NEXT
  if (value.startsWith('//') || value.startsWith('/\\')) return FALLBACK_NEXT
  return value
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
  // and passed through by the login form's hidden field. '/Order' is where a
  // plain login lands.
  redirect(safeNext(formData.get('next')))
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