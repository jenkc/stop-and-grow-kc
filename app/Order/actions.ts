'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type OrderState = { error?: string }

const MAX_QUANTITY = 20

export async function placeOrder(
  _prev: unknown,
  formData: FormData,
): Promise<OrderState> {
  const supabase = await createClient()

  const str = (k: string) => String(formData.get(k) ?? '').trim()

  const fulfillment = str('fulfillment')
  if (fulfillment !== 'pickup' && fulfillment !== 'delivery') {
    return { error: 'Choose pickup or delivery.' }
  }

  const contactName = str('custName')
  if (!contactName) return { error: 'Please enter your name.' }

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
  // customer_id null — both shapes are allowed by orders_insert_own.
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
  const deliveryFeeCents = 0

  const isDelivery = fulfillment === 'delivery'
  if (isDelivery && !str('streetAddress')) {
    return { error: 'Delivery orders need a street address.' }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      contact_name: contactName,
      contact_email: str('custEmail') || null,
      contact_phone: str('custPhone') || null,
      fulfillment,
      time_window: isDelivery ? str('timeWindow') || null : null,
      ship_street: isDelivery ? str('streetAddress') || null : null,
      ship_apt: isDelivery ? str('aptSuite') || null : null,
      ship_city: isDelivery ? str('city') || null : null,
      ship_state: isDelivery ? str('state') || null : null,
      ship_zip: isDelivery ? str('zipCode') || null : null,
      subtotal_cents: subtotalCents,
      delivery_fee_cents: deliveryFeeCents,
      total_cents: subtotalCents + deliveryFeeCents,
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return { error: 'Could not place that order. Please try again.' }
  }

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    box_tier_id: tier.id,
    description: tier.name,
    quantity,
    unit_price_cents: tier.price_cents,
    line_total_cents: subtotalCents,
  })

  if (itemError) {
    return { error: 'Could not save the order details. Please try again.' }
  }

  revalidatePath('/Order')
  redirect(`/Order?placed=${order.order_number}`)
}
