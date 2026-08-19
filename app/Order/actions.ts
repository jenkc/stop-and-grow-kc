'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrderingCycle, closedMessage } from '@/lib/cycle'
import { sendNewOrderEmail } from '@/lib/email'
import { formatCents } from '@/lib/pricing'
import {
  LIMITS,
  boundedText,
  isPlausibleEmail,
  isPlausiblePhone,
  isValidState,
  isValidZip,
  isBot,
} from '@/lib/validation'
import type { Enums } from '@/lib/supabase/database.types'

export type OrderState = { error?: string }

const MAX_QUANTITY = 20

/**
 * Place an order. Guest and signed-in checkout both land here.
 *
 * Two clients, deliberately:
 *
 *   `supabase` (session)  — reads only. Who the caller is, and the catalog.
 *   `admin` (service-role) — the writes.
 *
 * No client-facing role can INSERT into orders: the publishable key ships to
 * every browser, and any policy permitting a client INSERT permits a
 * client-chosen price (a WITH CHECK cannot help — the client controls every
 * column it sends). So the order row is written by the service role, after this
 * function has validated it. See 20260806140000_orders_server_only_writes.sql.
 *
 * Because the admin client bypasses RLS, nothing below may take identity from
 * the form. `customerId` is derived from the session and only from the session.
 */
export async function placeOrder(
  _prev: unknown,
  formData: FormData,
): Promise<OrderState> {
  const supabase = await createClient()

  // The gate. /Order also checks this to decide whether to render the form, but
  // that is a courtesy — a disabled form still POSTs, so this is the check that
  // actually closes ordering. Everything below assumes an open cycle exists.
  const gate = await getOrderingCycle()
  if (!gate.open) return { error: closedMessage(gate.reason) }
  const cycle = gate.cycle

  const str = (k: string) => String(formData.get(k) ?? '').trim()

  // Hidden from people, filled by bots. Report success rather than explaining
  // the check — same treatment as /Contact.
  if (isBot(str('website'))) {
    redirect('/Order?placed=received')
  }

  const rawFulfillment = str('fulfillment')
  if (rawFulfillment !== 'pickup' && rawFulfillment !== 'delivery') {
    return { error: 'Choose pickup or delivery.' }
  }
  // Bound to a fresh const so the narrowing survives into orderRow. Reading the
  // widened `string` straight into the insert fails against fulfillment_kind.
  const fulfillment: Enums<'fulfillment_kind'> = rawFulfillment

  // Every free-text field is bounded. The columns are `text` with no length
  // cap, so without this a multi-megabyte dietary note commits — and then
  // renders on the runsheet Scraps reads in the van.
  const nameField = boundedText(str('custName'), LIMITS.name, 'Your name', {
    required: true,
  })
  if (!nameField.ok) return { error: nameField.error }
  const contactName = nameField.value

  const emailField = boundedText(str('custEmail'), LIMITS.email, 'Your email')
  if (!emailField.ok) return { error: emailField.error }
  // Optional — a phone-only guest order is legitimate — but if given it has to
  // be plausible, because order confirmations will be mailed to it.
  if (emailField.value && !isPlausibleEmail(emailField.value)) {
    return { error: 'Please enter a valid email address.' }
  }

  const phoneField = boundedText(str('custPhone'), LIMITS.phone, 'Your phone number')
  if (!phoneField.ok) return { error: phoneField.error }
  if (phoneField.value && !isPlausiblePhone(phoneField.value)) {
    return { error: 'Please enter a valid phone number.' }
  }

  const notesField = boundedText(str('dietaryNotes'), LIMITS.notes, 'That note')
  if (!notesField.ok) return { error: notesField.error }

  // "How did you hear about us?" — optional, free text.
  const sourceField = boundedText(str('entrySource'), LIMITS.name, 'That answer')
  if (!sourceField.ok) return { error: sourceField.error }

  const quantity = Number(formData.get('quantity'))
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return { error: 'Choose how many boxes you want.' }
  }

  // Price comes from the database, never from the form. A posted price is just
  // a claim by the browser — trusting it means anyone can order a $30 box for
  // a penny.
  const boxTierId = str('boxTierId')
  if (!boxTierId) return { error: 'Choose a box size.' }

  const { data: tier, error: tierError } = await supabase
    .from('box_tiers')
    .select('id, name, price_cents, active')
    .eq('id', boxTierId)
    .single()

  if (tierError || !tier || !tier.active) {
    return { error: 'That box is no longer available.' }
  }

  // A signed-in order is attached to the customer row the auth trigger created.
  // A guest order carries contact details on the order itself and leaves
  // customer_id null. Read from the session client, not the admin one — this is
  // the only thing establishing who the caller is.
  const { data: claims } = await supabase.auth.getClaims()
  const authId = claims?.claims?.sub ?? null

  let customerId: string | null = null
  if (authId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle()
    customerId = customer?.id ?? null
  }

  const subtotalCents = tier.price_cents * quantity

  // Deliberately 0, including for delivery orders. The $5 delivery fee is a
  // line item Scraps adds from /Admin when it applies — she waives it at her
  // discretion, so charging it automatically here would be wrong more often
  // than it was right. See DELIVERY_FEE_CENTS in lib/pricing.ts.
  const deliveryFeeCents = 0

  const isDelivery = fulfillment === 'delivery'

  // Checked here rather than left to orders_delivery_needs_address /
  // orders_ship_state_check / orders_ship_zip_check. Those constraints fire
  // during the insert, so relying on them turns a fixable typo into "Could not
  // place that order. Please try again" — advice a visitor cannot act on. The
  // constraints stay as the backstop; these produce the message.
  const streetField = boundedText(str('streetAddress'), LIMITS.street, 'Street address', {
    required: isDelivery,
    missing: 'a street address',
  })
  if (!streetField.ok) return { error: streetField.error }

  const aptField = boundedText(str('aptSuite'), LIMITS.apt, 'Apartment or suite')
  if (!aptField.ok) return { error: aptField.error }

  const cityField = boundedText(str('city'), LIMITS.city, 'City', {
    required: isDelivery,
    missing: 'a city',
  })
  if (!cityField.ok) return { error: cityField.error }

  const state = str('state')
  const zip = str('zipCode')

  if (isDelivery) {
    if (!state) return { error: 'Please choose a state.' }
    if (!isValidState(state)) return { error: 'Please choose a valid state.' }
    if (!zip) return { error: 'Please enter a ZIP code.' }
    if (!isValidZip(zip)) {
      return { error: 'Please enter a valid ZIP code, like 64111.' }
    }
  }

  // The chosen window is verified against the database, not trusted from the
  // form: it must exist, belong to THIS cycle, and match the fulfillment kind.
  // Without the cycle check a stale page could book a window from last week;
  // without the kind check a delivery order could claim a pickup slot.
  const windowId = str('windowId')
  if (!windowId) {
    return {
      error: isDelivery
        ? 'Choose a delivery time window.'
        : 'Choose a pickup time.',
    }
  }

  const { data: window, error: windowError } = await supabase
    .from('delivery_windows')
    .select('id, kind, cycle_id')
    .eq('id', windowId)
    .eq('cycle_id', cycle.id)
    .eq('kind', fulfillment)
    .maybeSingle()

  if (windowError || !window) {
    return { error: 'That time is no longer available. Please pick another.' }
  }

  const orderRow = {
      customer_id: customerId,
      contact_name: contactName,
      contact_email: emailField.value || null,
      contact_phone: phoneField.value || null,
      fulfillment,
      window_id: window.id,
      // Superseded by window_id. Left null rather than removed: the column is
      // dropped in a later migration, once nothing reads it.
      time_window: null,
      dietary_notes: notesField.value || null,
      entry_source: sourceField.value || null,
      ship_street: isDelivery ? streetField.value || null : null,
      ship_apt: isDelivery ? aptField.value || null : null,
      ship_city: isDelivery ? cityField.value || null : null,
      ship_state: isDelivery ? state || null : null,
      ship_zip: isDelivery ? zip || null : null,
      subtotal_cents: subtotalCents,
      delivery_fee_cents: deliveryFeeCents,
      total_cents: subtotalCents + deliveryFeeCents,
  }

  // Stamped from the session, never the form. Derived from customerId rather
  // than authId: someone signed in whose customers row is missing places an
  // order that behaves like a guest order, and should be counted as one.
  const checkoutMethod = customerId ? 'account' : 'guest'

  // From here on: writes. Everything above was validation against the session
  // client, so this is the first use of the RLS-bypassing role.
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({ ...orderRow, checkout_method: checkoutMethod })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return { error: 'Could not place that order. Please try again.' }
  }

  const { error: itemError } = await admin.from('order_items').insert([
    {
      order_id: order.id,
      box_tier_id: tier.id,
      description: tier.name,
      quantity,
      unit_price_cents: tier.price_cents,
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
      // Now there IS an empty order. Say so loudly — it needs manual removal.
      console.error(
        `[order] orphaned order ${order.order_number} (${order.id}): items insert failed and cleanup failed:`,
        cleanupError,
      )
    }

    return { error: 'Could not save the order details. Please try again.' }
  }

  revalidatePath('/Order')

  // Tell Scraps. after() runs once the response is on its way, so the Resend
  // round trip never sits between the customer and their confirmation page —
  // the same reason /auth/confirm sends the welcome email this way.
  //
  // Everything it needs is already in hand except the window's label, which was
  // looked up above as an id. Read it here rather than inside the email helper:
  // a notification must not be able to throw a database error into the order
  // path, and after() has no way to report one.
  const { data: windowRow } = await supabase
    .from('delivery_windows')
    .select('label')
    .eq('id', window.id)
    .maybeSingle()

  const addressLines = isDelivery
    ? [
        streetField.value,
        aptField.value,
        [cityField.value, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : ''),
      ]
        .filter(Boolean)
        .join('\n')
    : null

  after(() =>
    sendNewOrderEmail({
      orderNumber: order.order_number,
      contactName,
      contactEmail: emailField.value || null,
      contactPhone: phoneField.value || null,
      fulfillment,
      windowLabel: windowRow?.label ?? null,
      total: formatCents(subtotalCents + deliveryFeeCents),
      items: [
        {
          description: tier.name,
          quantity,
          lineTotal: formatCents(subtotalCents),
        },
      ],
      dietaryNotes: notesField.value || null,
      address: addressLines,
    }),
  )

  redirect(`/Order?placed=${order.order_number}`)
}
