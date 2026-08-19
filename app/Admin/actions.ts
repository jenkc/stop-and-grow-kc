'use server'

import { revalidatePath } from 'next/cache'
import { getAdminEmail } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { DELIVERY_FEE_CENTS, DELIVERY_FEE_DESCRIPTION } from '@/lib/pricing'
import {
  validateOrderFields,
  writeOrder,
  writeCustomOrder,
  type CustomLine,
} from '@/lib/order-intake'
import { LIMITS, boundedText } from '@/lib/validation'
import type { Enums } from '@/lib/supabase/database.types'

const MAX_QUANTITY = 20

/**
 * Admin mutations.
 *
 * EVERY function here calls requireAdmin() first. That is not belt-and-braces:
 * a Server Action compiles to a public POST endpoint, reachable by anyone who
 * knows its id, and the gate on /Admin only decides what renders. An action
 * that trusts the page gate is an unauthenticated write endpoint.
 *
 * All writes go through createAdminClient(). There is deliberately no
 * admin-write RLS — every policy in the schema is `_admin_read` — so the
 * service role is the only path, and it bypasses RLS entirely. Nothing below
 * may take identity or authorization from its arguments.
 */

export type AdminActionState = { error?: string; ok?: string }

const FORBIDDEN: AdminActionState = { error: 'Not authorized.' }

/**
 * Throws nothing; returns the admin email or null. Callers return FORBIDDEN
 * rather than redirecting, because these run from forms embedded in a page the
 * caller is already looking at.
 */
async function requireAdmin(): Promise<string | null> {
  return await getAdminEmail()
}

/** Refresh every screen that shows order state. */
function revalidateAdmin() {
  revalidatePath('/Admin')
  revalidatePath('/Admin/Runsheet')
  revalidatePath('/Admin/Money')
}

/**
 * Enter an order Scraps took by phone, text, or in person.
 *
 * DELIBERATELY NOT GATED ON ORDERING BEING OPEN. The public form refuses
 * submissions outside an open cycle, and should — but a call on Thursday
 * afternoon, after close, is exactly the case this exists to serve. Applying
 * the customer-facing gate here would block the only person allowed to override
 * it. Being an admin IS the authorization.
 *
 * The window is still validated against a real cycle: an order with no window
 * lands under "No time set" on the runsheet, which is how a delivery gets
 * missed. She picks from whatever weeks currently have windows, so a late order
 * can be filed into next week rather than the one that just closed.
 */
export async function createOrder(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  const validated = validateOrderFields(formData)
  if (!validated.ok) return { error: validated.error }
  const fields = validated.fields

  const quantity = Number(formData.get('quantity'))
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return { error: 'Choose how many boxes.' }
  }

  const admin = createAdminClient()

  // Price from the database, not the form — the same rule as the public path.
  // It matters less here (an admin could edit the row anyway) but keeping the
  // rule uniform means there is no "trusted" write path to find later.
  const boxTierId = String(formData.get('boxTierId') ?? '')
  const { data: tier, error: tierError } = await admin
    .from('box_tiers')
    .select('id, name, price_cents')
    .eq('id', boxTierId)
    .maybeSingle()

  if (tierError || !tier) return { error: 'Choose a box size.' }

  // Any window on any cycle, but it must exist and match the fulfillment kind:
  // a delivery cannot claim a pickup slot. No cycle-status filter — that is the
  // override this function exists to provide.
  const windowId = String(formData.get('windowId') ?? '')
  if (!windowId) {
    return {
      error:
        fields.fulfillment === 'delivery'
          ? 'Choose a delivery time.'
          : 'Choose a pickup time.',
    }
  }

  const { data: window, error: windowError } = await admin
    .from('delivery_windows')
    .select('id')
    .eq('id', windowId)
    .eq('kind', fields.fulfillment)
    .maybeSingle()

  if (windowError || !window) {
    return { error: 'That time does not match pickup/delivery. Pick another.' }
  }

  const result = await writeOrder({
    fields,
    windowId: window.id,
    // Not linked to a customer account: Scraps is typing on someone's behalf,
    // and guessing which customers row they meant would attach the order — and
    // its address — to the wrong person.
    customerId: null,
    checkoutMethod: 'guest',
    quantity,
    unitPriceCents: tier.price_cents,
    description: tier.name,
    boxTierId: tier.id,
  })

  if (!result.ok) return { error: result.error }

  revalidateAdmin()
  return { ok: `Order ${result.orderNumber} added.` }
}

/** A restaurant order can carry more lines than a box order ever would. */
const MAX_LINES = 30

/**
 * Dollars as typed -> integer cents.
 *
 * Parsing money with Number() and multiplying by 100 is where rounding bugs
 * live: 45.10 * 100 is 4509.999... in float, which truncates to $45.09. Round
 * instead of truncating, and reject anything that is not a plain amount so a
 * pasted "$45.00" or "1,200" fails visibly rather than becoming a wrong total.
 */
function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const cents = Math.round(Number(cleaned) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

/**
 * Enter a restaurant order — arbitrary lines, negotiated prices.
 *
 * This is the "general line-item editor" the delivery-fee comment below has
 * been pointing at. Restaurants do not buy $20 boxes: Scraps quotes them
 * directly and types the agreed figures in, so unlike every other write path in
 * this app the prices DO come from the form. That is safe only because
 * requireAdmin() gates it — see the warning on writeCustomOrder().
 *
 * Like createOrder(), deliberately not gated on ordering being open. A
 * restaurant's standing Thursday order has nothing to do with whether the
 * public storefront is taking orders this week.
 */
export async function createRestaurantOrder(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  const validated = validateOrderFields(formData)
  if (!validated.ok) return { error: validated.error }
  const fields = validated.fields

  // Parallel arrays: the form repeats these four names per row.
  const descriptions = formData.getAll('lineDescription').map(String)
  const quantities = formData.getAll('lineQuantity').map(String)
  const prices = formData.getAll('linePrice').map(String)
  const priceModes = formData.getAll('linePriceMode').map(String)

  if (
    descriptions.length !== quantities.length ||
    descriptions.length !== prices.length ||
    descriptions.length !== priceModes.length
  ) {
    return { error: 'Those order lines did not come through. Try again.' }
  }
  if (descriptions.length > MAX_LINES) {
    return { error: `That is more than ${MAX_LINES} lines.` }
  }

  const lines: CustomLine[] = []

  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i].trim()
    const rawQty = quantities[i].trim()
    const rawPrice = prices[i].trim()

    // A blank row is the last one the form rendered and she did not use.
    if (!description && !rawQty && !rawPrice) continue

    const bounded = boundedText(description, LIMITS.name, 'That line', {
      required: true,
      missing: 'a description',
    })
    if (!bounded.ok) return { error: `Line ${i + 1}: ${bounded.error}` }

    const quantity = Number(rawQty)
    // The order_items check constraint caps quantity at 20, so this is the
    // message rather than a failed insert. Price per unit is where a large
    // order goes — "40 lb tomatoes" is one line at a per-order price, not
    // quantity 40.
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return { error: `Line ${i + 1}: quantity must be a whole number from 1 to 20.` }
    }

    const amountCents = parseMoneyToCents(rawPrice)
    if (amountCents === null) {
      return { error: `Line ${i + 1}: price must be an amount like 45 or 45.50.` }
    }

    // Both columns are NOT NULL, so whichever figure she did not type gets
    // derived. Entering a total is the case where the derived unit price may not
    // divide evenly — $50 across 3 is $16.67 each, which multiplies back to
    // $50.01 — so the typed total is stored verbatim and the unit price is the
    // approximation. The reverse when she types a unit price. In both
    // directions the number she was given on the phone is the one that survives.
    // Whitelisted rather than cast: this is a public POST, and an unrecognised
    // value would otherwise reach an enum column and fail at the insert.
    const pricingMode = priceModes[i] === 'total' ? 'total' : 'each'
    const total = pricingMode === 'total'
    const lineTotalCents = total ? amountCents : amountCents * quantity
    const unitPriceCents = total ? Math.round(amountCents / quantity) : amountCents

    lines.push({
      description: bounded.value,
      quantity,
      unitPriceCents,
      lineTotalCents,
      pricingMode,
    })
  }

  if (lines.length === 0) return { error: 'Add at least one line to the order.' }

  const windowId = String(formData.get('windowId') ?? '')
  if (!windowId) {
    return {
      error:
        fields.fulfillment === 'delivery'
          ? 'Choose a delivery time.'
          : 'Choose a pickup time.',
    }
  }

  const admin = createAdminClient()

  // Same rule as createOrder: the window must exist and match the fulfillment
  // kind, so a delivery cannot claim a pickup slot. No cycle-status filter —
  // a restaurant order can land in a week that is not open to the public.
  const { data: window, error: windowError } = await admin
    .from('delivery_windows')
    .select('id')
    .eq('id', windowId)
    .eq('kind', fields.fulfillment)
    .maybeSingle()

  if (windowError || !window) {
    return { error: 'That time does not match pickup/delivery. Pick another.' }
  }

  const result = await writeCustomOrder({ fields, windowId: window.id, lines })
  if (!result.ok) return { error: result.error }

  revalidateAdmin()
  return { ok: `Order ${result.orderNumber} added.` }
}

/**
 * Move an order through pending -> packed -> fulfilled, or cancel it.
 *
 * 'confirmed' exists in the order_status enum but is deliberately never set:
 * Scraps' workflow is new -> packed -> done, and a state she never taps is a
 * state that only creates ambiguity in reports.
 */
export async function setOrderStatus(
  orderId: string,
  status: Extract<
    Enums<'order_status'>,
    'pending' | 'packed' | 'fulfilled' | 'cancelled'
  >,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  // Whitelist rather than trusting the argument: this is a public endpoint, and
  // the type annotation above is erased at runtime.
  const ALLOWED = ['pending', 'packed', 'fulfilled', 'cancelled'] as const
  if (!ALLOWED.includes(status)) return { error: 'Unknown status.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({
      status,
      // Stamped when it happens, cleared if the status is walked back — a
      // fulfilled_at on a pending order would quietly corrupt any report that
      // counts deliveries by date.
      fulfilled_at: status === 'fulfilled' ? new Date().toISOString() : null,
    })
    .eq('id', orderId)

  if (error) {
    console.error('[admin] setOrderStatus failed:', error)
    return { error: 'Could not update that order.' }
  }

  revalidateAdmin()
  return { ok: `Marked ${status}.` }
}

/**
 * Cancel an order. The row is KEPT — cancelled orders stay queryable for the
 * week's numbers, they simply drop off the runsheet. No refund handling: money
 * already taken is settled outside the app for now.
 */
export async function cancelOrder(orderId: string): Promise<AdminActionState> {
  return await setOrderStatus(orderId, 'cancelled')
}

/**
 * Mark orders paid, in a batch.
 *
 * Scraps reconciles from a stack at a desk rather than at the door, so this
 * takes an array: tick several, choose the method once, one submit.
 *
 * payments is an append-only ledger — a row is inserted per order and never
 * updated. Partial payments are out of scope: amount_paid is set to the full
 * total, so payment_status is only ever 'unpaid' or 'paid' here.
 */
export async function markPaid(
  orderIds: string[],
  method: Enums<'payment_method'>,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  const METHODS = ['card', 'cash', 'check', 'venmo', 'other'] as const
  if (!METHODS.includes(method)) return { error: 'Unknown payment method.' }

  const ids = orderIds.filter(Boolean)
  if (ids.length === 0) return { error: 'Select at least one order.' }

  const admin = createAdminClient()

  // Amounts come from the database, never from the caller — the same rule that
  // keeps placeOrder() from trusting a posted price.
  const { data: orders, error: readError } = await admin
    .from('orders')
    .select('id, total_cents, payment_status')
    .in('id', ids)

  if (readError || !orders) {
    console.error('[admin] markPaid read failed:', readError)
    return { error: 'Could not read those orders.' }
  }

  // Skip anything already settled so a double-submit cannot double-post to the
  // ledger.
  const unpaid = orders.filter((o) => o.payment_status !== 'paid')
  if (unpaid.length === 0) return { ok: 'Those orders were already paid.' }

  const { error: ledgerError } = await admin.from('payments').insert(
    unpaid.map((o) => ({
      order_id: o.id,
      method,
      amount_cents: o.total_cents,
      status: 'succeeded',
      received_at: new Date().toISOString(),
    })),
  )

  if (ledgerError) {
    console.error('[admin] markPaid ledger insert failed:', ledgerError)
    return { error: 'Could not record those payments.' }
  }

  // Ledger first, then the denormalised columns. If this half fails the money
  // is still recorded, which is the recoverable direction — the reverse would
  // show orders as paid with nothing backing them.
  const failures: string[] = []
  for (const o of unpaid) {
    const { error } = await admin
      .from('orders')
      .update({ payment_status: 'paid', amount_paid_cents: o.total_cents })
      .eq('id', o.id)
    if (error) failures.push(o.id)
  }

  revalidateAdmin()

  if (failures.length > 0) {
    console.error('[admin] markPaid status update failed for:', failures)
    return {
      error: `Recorded ${unpaid.length} payment(s), but ${failures.length} order(s) still show unpaid. Refresh and check.`,
    }
  }

  return { ok: `Marked ${unpaid.length} order(s) paid.` }
}

/**
 * Mark one order paid, from wherever it is on screen.
 *
 * A thin wrapper over markPaid() rather than its own write path — same ledger
 * insert, same already-paid guard, same money-from-the-database rule. The only
 * thing it adds is a default method, because a single tap at a door has no
 * room for a picker and cash is what is usually in the hand.
 *
 * Deliberately one-way. payments is append-only: a row is inserted and never
 * updated, so there is no un-pay that does not either delete a record of money
 * received or invent a reversal concept the app does not have. The UI asks for
 * confirmation before calling this instead — a mistaken tap is recoverable by
 * saying no, and a wrong "paid" is fixed in the database, which is the right
 * amount of friction for money.
 */
export async function markOnePaid(
  orderId: string,
  method: Enums<'payment_method'> = 'cash',
): Promise<AdminActionState> {
  return await markPaid([orderId], method)
}

/**
 * Undo a mistaken "paid".
 *
 * This is error correction, not a refund. Nothing was given back — the order
 * was marked paid when it should not have been — so the ledger row is VOIDED
 * rather than deleted or offset by a negative entry.
 *
 * Voiding keeps payments append-only in the way that matters: the row stays,
 * carrying what was recorded and that it was retracted, so the order detail
 * page can show "cash $25.00 — voided" instead of the payment silently never
 * having existed. Deleting would erase a record of money someone may actually
 * have handed over.
 *
 * payments.status is free text with a 'succeeded' default, so 'voided' needs no
 * migration. Only two places in the app read this table — this write and the
 * order detail page — so there is no total elsewhere that a voided row would
 * quietly corrupt. Any future sum MUST filter on status = 'succeeded'.
 *
 * If real money genuinely changed hands and is being returned, that is a refund
 * and wants its own concept (payment_status already has a 'refunded' member).
 * This is deliberately not that.
 */
export async function markUnpaid(orderId: string): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  const admin = createAdminClient()

  // Only the ones still standing. Voiding an already-voided row would restamp
  // it and lose when the correction actually happened.
  const { error: voidError } = await admin
    .from('payments')
    .update({ status: 'voided' })
    .eq('order_id', orderId)
    .eq('status', 'succeeded')

  if (voidError) {
    console.error('[admin] markUnpaid void failed:', voidError)
    return { error: 'Could not void that payment.' }
  }

  // Ledger first, then the order — the same order as markPaid, and for the same
  // reason. If this half fails the payment is voided but the order still reads
  // paid, which is visible and fixable; the reverse would show an unpaid order
  // with a live payment behind it.
  const { error: orderError } = await admin
    .from('orders')
    .update({ payment_status: 'unpaid', amount_paid_cents: 0 })
    .eq('id', orderId)

  if (orderError) {
    console.error('[admin] markUnpaid order update failed:', orderError)
    return { error: 'Voided the payment, but the order still shows paid.' }
  }

  revalidateAdmin()
  return { ok: 'Marked unpaid.' }
}

/**
 * Add the delivery fee to an order.
 *
 * Narrow on purpose. The fee is not charged automatically at checkout because
 * Scraps waives it at her discretion, so this is how it gets on an order when
 * it applies. A general line-item editor (arbitrary description and price, for
 * restaurant orders) is phase 3b and will replace this.
 */
export async function addDeliveryFee(
  orderId: string,
  amountCents: number = DELIVERY_FEE_CENTS,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  // $5 is the usual figure, not a fixed one — a run to Independence is not the
  // same as one to Westport, and she is the one deciding. Bounded rather than
  // trusted: this is a public POST like any other action.
  if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > 100_00) {
    return { error: 'Enter a delivery fee between $0 and $100.' }
  }

  const admin = createAdminClient()

  const { data: order, error: readError } = await admin
    .from('orders')
    .select('id, total_cents, delivery_fee_cents')
    .eq('id', orderId)
    .single()

  if (readError || !order) {
    console.error('[admin] addDeliveryFee read failed:', readError)
    return { error: 'Could not find that order.' }
  }

  // Idempotent: tapping twice must not charge twice.
  const { data: existing } = await admin
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('description', DELIVERY_FEE_DESCRIPTION)
    .maybeSingle()

  if (existing) return { ok: 'Delivery fee is already on this order.' }

  const { error: itemError } = await admin.from('order_items').insert([
    {
      order_id: orderId,
      box_tier_id: null,
      description: DELIVERY_FEE_DESCRIPTION,
      quantity: 1,
      unit_price_cents: amountCents,
      line_total_cents: amountCents,
    },
  ])

  if (itemError) {
    console.error('[admin] addDeliveryFee insert failed:', itemError)
    return { error: 'Could not add the delivery fee.' }
  }

  // delivery_fee_cents as well as the total. It was previously left at 0, so
  // anything keying off it — the row menu's add-vs-remove label, any future
  // report separating goods from delivery — read the fee as absent on an order
  // that had one.
  const { error: totalError } = await admin
    .from('orders')
    .update({
      total_cents: order.total_cents + amountCents,
      delivery_fee_cents: amountCents,
    })
    .eq('id', orderId)

  if (totalError) {
    // The line exists but the total does not include it. Roll the line back so
    // the items always sum to the total.
    await admin
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
      .eq('description', DELIVERY_FEE_DESCRIPTION)
    console.error('[admin] addDeliveryFee total update failed:', totalError)
    return { error: 'Could not update the order total.' }
  }

  revalidateAdmin()
  return { ok: 'Delivery fee added.' }
}

/** Remove the delivery fee — she waived it after adding it. */
export async function removeDeliveryFee(orderId: string): Promise<AdminActionState> {
  if (!(await requireAdmin())) return FORBIDDEN

  const admin = createAdminClient()

  const { data: line } = await admin
    .from('order_items')
    .select('id, line_total_cents')
    .eq('order_id', orderId)
    .eq('description', DELIVERY_FEE_DESCRIPTION)
    .maybeSingle()

  if (!line) return { ok: 'No delivery fee on this order.' }

  const { data: order } = await admin
    .from('orders')
    .select('total_cents')
    .eq('id', orderId)
    .single()

  const { error } = await admin.from('order_items').delete().eq('id', line.id)
  if (error) {
    console.error('[admin] removeDeliveryFee failed:', error)
    return { error: 'Could not remove the delivery fee.' }
  }

  if (order) {
    await admin
      .from('orders')
      .update({
        total_cents: Math.max(0, order.total_cents - line.line_total_cents),
        // Cleared alongside the total, for the same reason addDeliveryFee sets
        // it: leaving a stale figure here means the order still claims a
        // delivery fee it no longer has a line for.
        delivery_fee_cents: 0,
      })
      .eq('id', orderId)
  }

  revalidateAdmin()
  return { ok: 'Delivery fee removed.' }
}