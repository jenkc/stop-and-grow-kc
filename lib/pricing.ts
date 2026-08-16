/**
 * Money constants. Cents everywhere — see BUILD-PLAN.md.
 *
 * Not server-only: the admin UI renders this figure on a button, and the value
 * is not a secret. Nothing here is an authorization input.
 */

/**
 * The delivery fee, as a line item.
 *
 * NOT charged automatically by placeOrder(). Scraps' notes show "$20+5", but she
 * waives it often enough that adding it to every delivery order would be wrong
 * more often than right. /Admin adds it per order when it applies.
 *
 * Lives in order_items with box_tier_id null, rather than in
 * orders.delivery_fee_cents, so it can be removed as easily as it was added and
 * so the items list sums to the order total without a special case.
 */
export const DELIVERY_FEE_CENTS = 500

export const DELIVERY_FEE_DESCRIPTION = 'Delivery'

/** "$20.00" from 2000. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}