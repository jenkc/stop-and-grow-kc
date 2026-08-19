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
}
