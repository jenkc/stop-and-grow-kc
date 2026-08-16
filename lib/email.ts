import 'server-only'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { ContactMessageEmail } from '@/emails/contact-message'
import { CONTACT_EMAIL } from '@/emails/theme'

/**
 * Transactional mail sent by the app itself.
 *
 * Supabase Auth sends the confirmation email over SMTP using its own template —
 * this module is only for mail we originate: the post-confirmation welcome, and
 * the contact form notification.
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

export type ContactMessage = {
    name: string
    email: string
    subject?: string
    body: string
}

/**
 * The /Contact form notification, sent to us.
 *
 * Unlike sendWelcomeEmail this reports failure to its caller instead of only
 * logging — but sendForm() deliberately does not surface that to the visitor.
 * The message row is already committed by the time this runs, so a mail failure
 * means "we will see it later in /Admin", not "your message was lost". Telling
 * the visitor it failed would only make them submit a duplicate.
 *
 * The return value exists so the caller can log with context, and so a future
 * retry or queue has something to branch on.
 */
export async function sendContactEmail(
    msg: ContactMessage,
): Promise<{ error?: string }> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.warn('[email] RESEND_API_KEY unset — skipping contact notification')
        return {}
    }

    try {
        const html = await render(ContactMessageEmail(msg))
        const text = await render(ContactMessageEmail(msg), { plainText: true })

        const { error } = await new Resend(apiKey).emails.send({
            from: FROM,
            // CONTACT_EMAIL is the only address Cloudflare Email Routing forwards.
            to: CONTACT_EMAIL,
            subject: `Contact form: ${msg.subject || `New message from ${msg.name}`}`,
            html,
            text,
            // The one place this differs from the welcome mail: Reply should reach
            // the visitor, not the routed inbox we just sent to.
            replyTo: msg.email,
        })

        if (error) {
            console.error('[email] contact send failed:', error)
            return { error: 'Contact notification failed to send.' }
        }

        return {}
    } catch (err) {
        console.error('[email] contact send threw:', err)
        return { error: 'Contact notification threw.' }
    }
}
