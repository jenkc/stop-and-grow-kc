import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  LIMITS,
  boundedText,
  isPlausibleEmail,
  isPlausiblePhone,
  isValidState,
  isValidZip,
} from '@/lib/validation'
import type { Enums } from '@/lib/supabase/database.types'

/**
 * The order fields, validated, and the write that follows.
 *
 * Two callers place orders and they are not the same job:
 *
 *   placeOrder()  — the public form. Gated on an OPEN cycle, identity from the
 *                   session, never trusts a posted price.
 *   createOrder() — /Admin/New. Scraps typing in a phone call. Deliberately NOT
 *                   gated on ordering being open: a call on Thursday after
 *                   close is exactly when she needs it.
 *
 * What they share is everything after "who is allowed to do this": the same
 * field rules, the same money math, the same two-row write with the same
 * rollback. Keeping that here means a fix to either applies to both — the
 * failure mode this codebase already hit once, when /Contact bounded its inputs
 * and /Order did not.
 *
 * Authorization is deliberately NOT here. Each caller establishes its own right
 * to write before calling in, because those checks are genuinely different and
 * a shared "is this allowed" would have to guess which one applies.
 */

export type IntakeResult =
  | { ok: true; orderNumber: string; orderId: string }
  | { ok: false; error: string }

/**
 * One line of a restaurant order — "20 lb tomatoes", 1, $45.00.
 *
 * box_tier_id is null on these: order_items.box_tier_id is nullable precisely so
 * a line can exist without a catalog row behind it. Nothing about the schema
 * needed to change for this.
 *
 * Both prices are carried because both columns are NOT NULL and they are stored
 * independently — there is no constraint tying line_total to unit * quantity.
 * The caller decides which one Scraps typed and derives the other, so a line
 * quoted as a lump sum keeps that exact total instead of a rounded unit price
 * multiplied back up.
 */
export type CustomLine = {
  description: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
  /**
   * Which figure a human typed. Not recoverable from the numbers afterwards —
   * $100 across 4 divides evenly and is indistinguishable from a real $25-each
   * line — so it is recorded rather than inferred. Sales analysis filters on it
   * before averaging unit_price_cents, since a derived unit price is not a price
   * anyone quoted.
   */
  pricingMode: Enums<'pricing_mode'>
}

export type IntakeFields = {
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  fulfillment: Enums<'fulfillment_kind'>
  dietaryNotes: string | null
  entrySource: string | null
  shipStreet: string | null
  shipApt: string | null
  shipCity: string | null
  shipState: string | null
  shipZip: string | null
}

export type ValidatedFields =
  | { ok: true; fields: IntakeFields }
  | { ok: false; error: string }

/**
 * Read and bound every free-text field on an order form.
 *
 * The columns are `text` with no length cap, so without this a multi-megabyte
 * dietary note commits and then renders on the runsheet. Address fields are
 * checked here rather than left to orders_delivery_needs_address and friends,
 * because those constraints fire during the INSERT — relying on them turns a
 * fixable typo into "could not place that order", which is not advice.
 */
export function validateOrderFields(formData: FormData): ValidatedFields {
  const str = (k: string) => String(formData.get(k) ?? '').trim()

  const rawFulfillment = str('fulfillment')
  if (rawFulfillment !== 'pickup' && rawFulfillment !== 'delivery') {
    return { ok: false, error: 'Choose pickup or delivery.' }
  }
  const fulfillment: Enums<'fulfillment_kind'> = rawFulfillment
  const isDelivery = fulfillment === 'delivery'

  const name = boundedText(str('custName'), LIMITS.name, 'Your name', {
    required: true,
    missing: 'a name',
  })
  if (!name.ok) return { ok: false, error: name.error }

  const email = boundedText(str('custEmail'), LIMITS.email, 'Your email')
  if (!email.ok) return { ok: false, error: email.error }
  if (email.value && !isPlausibleEmail(email.value)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }

  const phone = boundedText(str('custPhone'), LIMITS.phone, 'Your phone number')
  if (!phone.ok) return { ok: false, error: phone.error }
  if (phone.value && !isPlausiblePhone(phone.value)) {
    return { ok: false, error: 'Please enter a valid phone number.' }
  }

  const notes = boundedText(str('dietaryNotes'), LIMITS.notes, 'That note')
  if (!notes.ok) return { ok: false, error: notes.error }

  const source = boundedText(str('entrySource'), LIMITS.name, 'That answer')
  if (!source.ok) return { ok: false, error: source.error }

  const street = boundedText(str('streetAddress'), LIMITS.street, 'Street address', {
    required: isDelivery,
    missing: 'a street address',
  })
  if (!street.ok) return { ok: false, error: street.error }

  const apt = boundedText(str('aptSuite'), LIMITS.apt, 'Apartment or suite')
  if (!apt.ok) return { ok: false, error: apt.error }

  const city = boundedText(str('city'), LIMITS.city, 'City', {
    required: isDelivery,
    missing: 'a city',
  })
  if (!city.ok) return { ok: false, error: city.error }

  const state = str('state')
  const zip = str('zipCode')

  if (isDelivery) {
    if (!state) return { ok: false, error: 'Please choose a state.' }
    if (!isValidState(state)) return { ok: false, error: 'Please choose a valid state.' }
    if (!zip) return { ok: false, error: 'Please enter a ZIP code.' }
    if (!isValidZip(zip)) {
      return { ok: false, error: 'Please enter a valid ZIP code, like 64111.' }
    }
  }

  return {
    ok: true,
    fields: {
      contactName: name.value,
      contactEmail: email.value || null,
      contactPhone: phone.value || null,
      fulfillment,
      dietaryNotes: notes.value || null,
      entrySource: source.value || null,
      shipStreet: isDelivery ? street.value || null : null,
      shipApt: isDelivery ? apt.value || null : null,
      shipCity: isDelivery ? city.value || null : null,
      shipState: isDelivery ? state || null : null,
      shipZip: isDelivery ? zip || null : null,
    },
  }
}

/**
 * Write a restaurant order: one order row and N free-text lines.
 *
 * The counterpart to writeOrder(), which exists for box orders and takes a
 * box_tiers row the caller has already read. Here there is no catalog to read
 * from — restaurant pricing is negotiated per order, off-site, and Scraps types
 * the agreed figures in. So prices DO come from the form, which is safe only
 * because every caller is an admin: createRestaurantOrder() checks
 * getAdminEmail() before calling in. Never expose this to a public form without
 * replacing that assumption with a catalog lookup.
 *
 * Same manual rollback as writeOrder, for the same reason: PostgREST has no
 * cross-request transaction, so a failed items insert would otherwise leave a
 * committed order with nothing in it — a stop on the runsheet with no goods.
 */
export async function writeCustomOrder(opts: {
  fields: IntakeFields
  windowId: string
  lines: CustomLine[]
  status?: Enums<'order_status'>
}): Promise<IntakeResult> {
  // Sum the stored line totals, not unit * quantity — for a line entered as a
  // lump sum those differ by the rounding remainder, and the total she quoted is
  // the one that has to survive.
  const subtotalCents = opts.lines.reduce((sum, l) => sum + l.lineTotalCents, 0)
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      // Not linked to a customers row. A restaurant is not one of the household
      // accounts, and attaching it to the person who happened to call would put
      // their name and address on a business's order.
      customer_id: null,
      contact_name: opts.fields.contactName,
      contact_email: opts.fields.contactEmail,
      contact_phone: opts.fields.contactPhone,
      fulfillment: opts.fields.fulfillment,
      window_id: opts.windowId,
      time_window: null,
      dietary_notes: opts.fields.dietaryNotes,
      entry_source: opts.fields.entrySource,
      ship_street: opts.fields.shipStreet,
      ship_apt: opts.fields.shipApt,
      ship_city: opts.fields.shipCity,
      ship_state: opts.fields.shipState,
      ship_zip: opts.fields.shipZip,
      subtotal_cents: subtotalCents,
      delivery_fee_cents: 0,
      total_cents: subtotalCents,
      checkout_method: 'guest',
      ...(opts.status ? { status: opts.status } : {}),
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('[order] restaurant insert failed:', orderError)
    return { ok: false, error: 'Could not create that order. Please try again.' }
  }

  const { error: itemError } = await admin.from('order_items').insert(
    opts.lines.map((l) => ({
      order_id: order.id,
      box_tier_id: null,
      description: l.description,
      quantity: l.quantity,
      unit_price_cents: l.unitPriceCents,
      line_total_cents: l.lineTotalCents,
      pricing_mode: l.pricingMode,
    })),
  )

  if (itemError) {
    const { error: cleanupError } = await admin
      .from('orders')
      .delete()
      .eq('id', order.id)

    if (cleanupError) {
      console.error(
        `[order] orphaned restaurant order ${order.order_number} (${order.id}): items insert failed and cleanup failed:`,
        cleanupError,
      )
    }

    return { ok: false, error: 'Could not save the order lines. Please try again.' }
  }

  return { ok: true, orderNumber: order.order_number, orderId: order.id }
}

/**
 * Write the order and its single box line.
 *
 * `unitPriceCents` and `description` come from a box_tiers row the caller has
 * already read from the database — never from the form. A posted price is a
 * claim by the browser, and trusting it means a $30 box for a penny.
 *
 * No delivery fee is added. It is a line Scraps adds per order from the
 * runsheet, because she waives it often enough that charging automatically
 * would be wrong more often than right.
 */
export async function writeOrder(opts: {
  fields: IntakeFields
  windowId: string
  customerId: string | null
  checkoutMethod: Enums<'checkout_method'>
  quantity: number
  unitPriceCents: number
  description: string
  boxTierId: string
  status?: Enums<'order_status'>
}): Promise<IntakeResult> {
  const subtotalCents = opts.unitPriceCents * opts.quantity
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      customer_id: opts.customerId,
      contact_name: opts.fields.contactName,
      contact_email: opts.fields.contactEmail,
      contact_phone: opts.fields.contactPhone,
      fulfillment: opts.fields.fulfillment,
      window_id: opts.windowId,
      // Superseded by window_id. Left null rather than removed: the column is
      // dropped in a later migration, once nothing reads it.
      time_window: null,
      dietary_notes: opts.fields.dietaryNotes,
      entry_source: opts.fields.entrySource,
      ship_street: opts.fields.shipStreet,
      ship_apt: opts.fields.shipApt,
      ship_city: opts.fields.shipCity,
      ship_state: opts.fields.shipState,
      ship_zip: opts.fields.shipZip,
      subtotal_cents: subtotalCents,
      // Always 0 — see the note on the delivery fee above.
      delivery_fee_cents: 0,
      total_cents: subtotalCents,
      checkout_method: opts.checkoutMethod,
      ...(opts.status ? { status: opts.status } : {}),
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('[order] insert failed:', orderError)
    return { ok: false, error: 'Could not place that order. Please try again.' }
  }

  const { error: itemError } = await admin.from('order_items').insert([
    {
      order_id: order.id,
      box_tier_id: opts.boxTierId,
      description: opts.description,
      quantity: opts.quantity,
      unit_price_cents: opts.unitPriceCents,
      line_total_cents: subtotalCents,
    },
  ])

  if (itemError) {
    // Roll back by hand. PostgREST gives no cross-request transaction, so a
    // failure here would otherwise leave a committed order containing nothing —
    // it would show on the runsheet as a stop with no boxes. Deleting is safe:
    // this order is one statement old and nothing else can reference it yet.
    const { error: cleanupError } = await admin
      .from('orders')
      .delete()
      .eq('id', order.id)

    if (cleanupError) {
      console.error(
        `[order] orphaned order ${order.order_number} (${order.id}): items insert failed and cleanup failed:`,
        cleanupError,
      )
    }

    return { ok: false, error: 'Could not save the order details. Please try again.' }
  }

  return { ok: true, orderNumber: order.order_number, orderId: order.id }
}
