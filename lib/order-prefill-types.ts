/**
 * Split out from lib/order-prefill.ts, which is 'server-only' and so cannot be
 * imported by a client component — not even for a type. The keys match the
 * form's field names exactly, which is what lets OrderForm index this by name.
 */
export type OrderPrefill = {
  custName?: string
  custEmail?: string
  custPhone?: string
  streetAddress?: string
  aptSuite?: string
  city?: string
  state?: string
  zipCode?: string
  /**
   * Carried over from their last order. A dietary restriction is usually a
   * standing fact rather than a one-week request — someone who cannot eat beets
   * this week cannot eat them next week either — and retyping it every time is
   * how it eventually gets left off.
   *
   * Editable like any other field, so a genuine one-off is one deletion away.
   */
  dietaryNotes?: string
}
