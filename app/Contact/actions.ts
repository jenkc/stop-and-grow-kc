'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactEmail } from '@/lib/email'
import { LIMITS, boundedText, isPlausibleEmail, isBot } from '@/lib/validation'

export type ContactState = { error?: string }

/**
 * Handle a /Contact submission.
 *
 * Saved first, emailed second, and that order is the point. The row is the
 * durable record: if Resend is down or the routed inbox misses it, the message
 * still exists in the database. Emailing first and writing second would lose
 * the message on the failure that actually happens.
 *
 * Written with the service-role client. No client-facing role can INSERT into
 * messages — the publishable key ships to every browser, so an anon INSERT
 * policy on a public form's table is a public spam sink. See
 * _Documents/ADD-MESSAGES-TABLE.sql §3, and APPLY-NOW.sql §4 for the same
 * reasoning applied to orders.
 *
 * The caller is unauthenticated by design: /Contact is not in
 * PROTECTED_PREFIXES (lib/supabase/proxy.ts). Nothing here reads a session.
 */
export async function sendForm(
  _prev: unknown,
  formData: FormData,
): Promise<ContactState> {
  const str = (k: string) => String(formData.get(k) ?? '').trim()

  // Honeypot. The field is hidden from people and left blank by them; a bot
  // that fills every input trips it. Bail before writing or sending, but report
  // success anyway — telling a scraper it was caught only teaches it the shape
  // of the check.
  if (isBot(str('website'))) {
    redirect('/Contact?sent=1')
  }

  // Limits and the email check live in lib/validation.ts, shared with
  // placeOrder(). They used to be defined here and nowhere else, which is how
  // /Order ended up with no bounds at all.
  const nameField = boundedText(str('name'), LIMITS.name, 'Your name', {
    required: true,
  })
  if (!nameField.ok) return { error: nameField.error }
  const name = nameField.value

  const emailField = boundedText(str('email'), LIMITS.email, 'Your email address', {
    required: true,
  })
  if (!emailField.ok) return { error: emailField.error }
  if (!isPlausibleEmail(emailField.value)) {
    return { error: 'Please enter a valid email address.' }
  }
  const email = emailField.value

  const subjectField = boundedText(str('subject'), LIMITS.subject, 'That subject')
  if (!subjectField.ok) return { error: subjectField.error }
  const subject = subjectField.value

  const bodyField = boundedText(str('body'), LIMITS.body, 'That message', {
    required: true,
    missing: 'a message',
  })
  if (!bodyField.ok) return { error: bodyField.error }
  const body = bodyField.value

  const admin = createAdminClient()

  const { error: insertError } = await admin.from('messages').insert({
    name,
    email,
    subject: subject || null,
    body,
  })

  if (insertError) {
    console.error('[contact] insert failed:', insertError)
    return { error: 'Could not send that message. Please try again.' }
  }

  // Saved. From here nothing may fail the action — the message is already
  // recorded, and a visitor who resubmits would only duplicate the row.
  // sendContactEmail logs its own failures; the return value is checked so the
  // reason is visible next to the message it belongs to.
  const { error: mailError } = await sendContactEmail({
    name,
    email,
    subject: subject || undefined,
    body,
  })

  if (mailError) {
    console.error(`[contact] saved but not emailed (${name} <${email}>): ${mailError}`)
  }

  revalidatePath('/Contact')
  // redirect() throws — it has to be the last statement, outside any try.
  redirect('/Contact?sent=1')
}
