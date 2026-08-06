import 'server-only'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { CONTACT_EMAIL } from '@/emails/theme'

/**
 * Transactional mail sent by the app itself.
 *
 * Supabase Auth sends the confirmation email over SMTP using its own template —
 * this module is only for mail we originate, currently the post-confirmation
 * welcome.
 *
 * Both go out through Resend on the mail. subdomain, which is deliberately
 * separate from the apex so a future newsletter cannot damage the sending
 * reputation of auth mail.
 */

const FROM = 'Stop and Grow KC <no-reply@mail.stopandgrowkc.org>'

/**
 * Sending must never take down the flow that triggered it. A failed welcome
 * email is worth a log line, not a broken confirmation — the account is already
 * live by the time this runs.
 */
export async function sendWelcomeEmail(to: string, name?: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.warn('[email] RESEND_API_KEY unset — skipping welcome email')
        return
    }

    try {
        const html = await render(WelcomeEmail({ name }))
        const text = await render(WelcomeEmail({ name }), { plainText: true })

        const { error } = await new Resend(apiKey).emails.send({
            from: FROM,
            to,
            subject: 'Your Stop and Grow account is ready',
            html,
            text,
            // no-reply cannot receive, so point replies at the routed inbox.
            replyTo: CONTACT_EMAIL,
        })

        if (error) console.error('[email] welcome send failed:', error)
    } catch (err) {
        console.error('[email] welcome send threw:', err)
    }
}
