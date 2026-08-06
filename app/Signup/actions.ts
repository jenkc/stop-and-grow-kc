'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

export type SignupState = { error?: string }

/**
 * Supabase surfaces upstream failures (a rejected SMTP login, say) with a
 * `message` that is not always a string — an object there renders as a bare
 * "{}" in the form. Coerce to something displayable, and translate the cases a
 * customer can actually act on.
 */
function toMessage(error: { message?: unknown; code?: string; status?: number }): string {
  if (error.code === 'unexpected_failure' || error.status === 500) {
    // Almost always the confirmation email failing to send. The account was
    // not created, so "try again" is honest advice.
    return 'We could not send your confirmation email just now. Please try again in a few minutes.'
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  console.error('[signup] non-string error from Supabase:', error)
  return 'Something went wrong creating your account. Please try again.'
}

export async function signup(
  _prev: unknown,
  formData: FormData,
): Promise<SignupState> {
  const supabase = await createClient()
  const siteUrl = await getSiteUrl()

  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    options: {
      // Read by the A2 trigger to fill customers.name. Display only —
      // never trust this for authorization.
      data: { name: String(formData.get('name') ?? '').trim() },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })

  if (error) return { error: toMessage(error) }

  revalidatePath('/', 'layout')
  redirect('/Signup?check=1')
}