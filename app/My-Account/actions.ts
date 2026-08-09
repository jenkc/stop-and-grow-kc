'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** What an anonymized customers row shows once the person behind it is gone. */
const ANONYMIZED_NAME = 'Deleted customer'

/**
 * Permanently delete the signed-in user's account.
 *
 * Order history survives on purpose. Both foreign keys are `on delete set null`
 * (see the baseline migration), so removing the login would already leave the
 * orders standing — the business needs those totals for its books. What this
 * does is sever the person from them: the auth user is deleted so they can no
 * longer sign in, and every personal field is scrubbed from the customers row
 * and from the contact details captured on each of their orders.
 *
 * Sequence matters:
 *   1. Read identity from the session (never from the form).
 *   2. Scrub the profile and order contact details — while auth_id still
 *      resolves the customers row.
 *   3. Delete the auth user last, so a failure in step 2 leaves an account the
 *      user can still sign into and retry, rather than orphaned personal data
 *      with no owner.
 *   4. Sign out. Deleting a user does NOT invalidate tokens already issued, so
 *      without this the browser keeps a usable session cookie.
 */
export async function deleteAccount(_prev: unknown, formData: FormData) {
  const supabase = await createClient()

  const { data: claims } = await supabase.auth.getClaims()
  const authId = claims?.claims?.sub as string | undefined
  const email = claims?.claims?.email as string | undefined

  // The proxy guards /My-Account, so this is a belt-and-braces check rather
  // than the primary gate.
  if (!authId) return { error: 'You need to be signed in to do that.' }

  // Typed confirmation. Compared against the session email, never against a
  // value that also came from the form — otherwise the check is circular and
  // confirms nothing.
  const typed = String(formData.get('confirmEmail') ?? '').trim().toLowerCase()
  if (!email || typed !== email.toLowerCase()) {
    return { error: 'That does not match your email address.' }
  }

  const admin = createAdminClient()

  // Find the row first: orders are keyed by customers.id, not auth_id.
  // This client bypasses RLS, so the auth_id filter is doing the security work
  // that a policy would normally do — it must not be dropped.
  const { data: customer, error: lookupError } = await admin
    .from('customers')
    .select('id')
    .eq('auth_id', authId)
    .maybeSingle()

  if (lookupError) {
    return { error: 'We could not delete your account just now. Please try again.' }
  }

  if (customer) {
    // Scrub the contact details copied onto each order at checkout. Without
    // this the name and email survive on every order row, and deleting the
    // profile would accomplish nothing.
    const { error: ordersError } = await admin
      .from('orders')
      .update({
        contact_name: ANONYMIZED_NAME,
        contact_email: null,
        contact_phone: null,
      })
      .eq('customer_id', customer.id)

    if (ordersError) {
      return { error: 'We could not delete your account just now. Please try again.' }
    }

    // Keep the row itself: orders.customer_id references it, and dropping it
    // would set those references to null and break the link between an order
    // and the (now anonymous) account that placed it.
    const { error: profileError } = await admin
      .from('customers')
      .update({
        name: ANONYMIZED_NAME,
        email: null,
        phone: null,
      })
      .eq('id', customer.id)

    if (profileError) {
      return { error: 'We could not delete your account just now. Please try again.' }
    }
  }

  // Last, and only once the scrubbing has succeeded.
  const { error: deleteError } = await admin.auth.admin.deleteUser(authId)
  if (deleteError) {
    return { error: 'We could not delete your account just now. Please try again.' }
  }

  // The access token issued before the delete is still cryptographically valid
  // until it expires, so drop the cookie explicitly.
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/?deleted=1')
}
