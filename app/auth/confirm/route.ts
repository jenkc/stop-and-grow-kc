import { type EmailOtpType } from '@supabase/supabase-js'
import { after, type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // A just-confirmed user is here to order, so send them straight to the order
  // page with the confirmation banner. An explicit ?next still wins — the proxy
  // sets it when it bounces a signed-out visitor off a protected page.
  const next = searchParams.get('next') ?? '/Order?confirmed=1'

  // Behind the cloudflared tunnel, request.url is the loopback address the
  // tunnel connected to (http://127.0.0.1:3000), not the public hostname — so
  // basing redirects on it lands the user on localhost. Resolve the public
  // origin from trusted headers instead, same as the signup email link does.
  const siteUrl = await getSiteUrl()

  if (tokenHash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    // `next` is attacker-influencable (it rides in on the query string), so
    // resolve it against our own origin and refuse anything that escapes it —
    // otherwise a crafted confirm link is an open redirect.
    if (!error) {
      // Only on a genuine first confirmation — verifyOtp succeeding means the
      // token was live, so this cannot double-send on a re-clicked link (that
      // path falls through to the already-used branch below).
      //
      // Take the user straight off the verifyOtp result. Calling getUser()
      // here instead makes a second round trip that reads the session cookie
      // this request has only just set — it can come back empty, and the
      // welcome email then gets skipped with no error anywhere.
      const user = data?.user
      if (user?.email) {
        const email = user.email
        const name = typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : undefined
        // Runs after the redirect is sent, so the Resend round trip never
        // stalls the confirmation click. after() still fires when the handler
        // redirects — see next/dist/docs/.../04-functions/after.md.
        after(() => sendWelcomeEmail(email, name || undefined))
      }

      const target = new URL(next, siteUrl)
      const safe = target.origin === siteUrl ? target : new URL('/', siteUrl)
      return NextResponse.redirect(safe)
    }

    // Confirmation tokens are single-use. Re-clicking a link that already
    // worked — or reloading the tab it opened — lands here with
    // otp_expired / "One-time token not found", which is not the same problem
    // as a corrupted or genuinely stale link. If the session is already valid,
    // the account is confirmed and there is nothing to apologise for.
    const { data: claims } = await supabase.auth.getClaims()
    if (claims?.claims?.sub) {
      const target = new URL(next, siteUrl)
      const safe = target.origin === siteUrl ? target : new URL('/', siteUrl)
      return NextResponse.redirect(safe)
    }

    // Token spent but no session (e.g. confirmed in another browser): say so
    // precisely rather than implying the link was broken.
    if (error.code === 'otp_expired') {
      return NextResponse.redirect(new URL('/Login?error=used', siteUrl))
    }
  }

  return NextResponse.redirect(new URL('/Login?error=link', siteUrl))
}