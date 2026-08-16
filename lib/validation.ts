/**
 * Form input validation, shared by /Order and /Contact.
 *
 * These two actions had drifted: /Contact bounded every field and required an
 * "@" in the address, while /Order accepted unbounded text in every free-text
 * column and never looked at the email at all. The columns are `text` with no
 * length cap, so a multi-megabyte dietary note committed happily — and then
 * rendered on the runsheet Scraps reads in the van.
 *
 * One module so the rules stop diverging. Not a schema library: this is small
 * enough that a dependency would cost more than it saves, and every function
 * returns a message a visitor can act on rather than a validation object.
 *
 * Not server-only. Nothing here is secret and the limits are useful to the
 * client for maxLength attributes — but note that client-side bounds are a
 * convenience, never the check. Everything below runs again in the Server
 * Action, because a form field is only a claim by the browser.
 */

/** Field length caps. Generous for real input, bounded against abuse. */
export const LIMITS = {
  name: 200,
  email: 320, // RFC 5321 maximum
  phone: 40, // room for "+1 (816) 555-0142 ext. 12"
  subject: 200,
  body: 5000,
  street: 200,
  apt: 100,
  city: 100,
  notes: 1000, // dietary notes — a sentence, not an essay
} as const

export type FieldResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

/**
 * A trimmed string within `max`, or an error naming the field.
 *
 * `label` is used in both messages, so pass what the visitor sees on the form
 * ("Your name"), not the column name. `missing` overrides the required-message
 * when the label alone does not make a grammatical sentence — "Please enter
 * city." reads like a stub, so the City field passes "a city".
 */
export function boundedText(
  raw: string,
  max: number,
  label: string,
  {
    required = false,
    missing,
  }: { required?: boolean; missing?: string } = {},
): FieldResult {
  const value = raw.trim()

  if (!value) {
    return required
      ? {
          ok: false,
          error: `Please enter ${missing ?? label.toLowerCase()}.`,
        }
      : { ok: true, value: '' }
  }

  if (value.length > max) {
    return {
      ok: false,
      error: `${label} is too long — please keep it under ${max} characters.`,
    }
  }

  return { ok: true, value }
}

/**
 * Deliberately not a full email regex.
 *
 * An address has to survive a round trip through a mail server to be worth
 * anything, and no pattern here can establish that. This catches the obvious
 * typo and the obvious junk; anything stricter rejects valid addresses (plus
 * tags, new TLDs, quoted local parts) for no gain.
 */
export function isPlausibleEmail(value: string): boolean {
  if (value.length > LIMITS.email) return false
  const at = value.indexOf('@')
  // Needs something before the @, something after it, a dot in the domain, and
  // no whitespace anywhere.
  if (at < 1 || at === value.length - 1) return false
  if (/\s/.test(value)) return false
  return value.slice(at + 1).includes('.')
}

/**
 * Phone digits, or null.
 *
 * Stored as the visitor typed it — formatting is how they recognise their own
 * number — but validated on digit count so "call me" does not end up on a
 * runsheet where a tel: link should be.
 */
export function isPlausiblePhone(value: string): boolean {
  if (value.length > LIMITS.phone) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Progressive US phone formatting for an input's displayed value.
 *
 * Purely cosmetic — the Server Action validates on digit count and stores
 * whatever arrives, so this never decides whether a number is acceptable.
 *
 * Formats only plainly-typed US numbers and gets out of the way otherwise:
 * anything with a "+" is left alone (an international number formatted as
 * (816) 555-0142 would be wrong), and so is anything past 10 digits, which is
 * how an extension or a country code survives being typed.
 *
 * Progressive because it runs on every keystroke: "816" -> "(816)",
 * "8165" -> "(816) 5". Formatting only on blur would move the caret under the
 * visitor mid-type.
 */
export function formatPhoneInput(value: string): string {
  if (value.includes('+')) return value

  const digits = value.replace(/\D/g, '')
  if (digits.length > 10) return value
  if (digits.length === 0) return ''

  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Two-letter state code. Mirrors orders_ship_state_check. */
export function isValidState(value: string): boolean {
  return /^[A-Za-z]{2}$/.test(value)
}

/**
 * 5-digit or ZIP+4. Mirrors orders_ship_zip_check exactly.
 *
 * Checking it here matters: the database constraint fires AFTER the order row
 * insert is attempted, so relying on it turns a fixable typo into "Could not
 * place that order. Please try again" — advice the visitor cannot act on.
 */
export function isValidZip(value: string): boolean {
  return /^[0-9]{5}(-[0-9]{4})?$/.test(value)
}

/**
 * Honeypot: a field hidden from people and left blank by them. A bot that fills
 * every input trips it.
 *
 * Callers should report success anyway — telling a scraper it was caught only
 * teaches it the shape of the check.
 */
export function isBot(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0
}
