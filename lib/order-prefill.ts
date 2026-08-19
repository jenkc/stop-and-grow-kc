import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { OrderPrefill } from '@/lib/order-prefill-types'

/**
 * What we already know about the person filling in the order form.
 *
 * One source: their customers row. Name and email arrive at signup; phone and
 * address are written back by placeOrder() the first time they order while
 * signed in, and refreshed on every order after that. So the record maintains
 * itself — there is no profile editor to build and nothing for the customer to
 * remember to update.
 *
 * Read through the RLS-bound session client, never the service role, so this
 * cannot return someone else's address even if the query were wrong.
 * customers_select_own limits it to their own row.
 *
 * Signed-out visitors get null and the form renders exactly as it always has.
 */

export type { OrderPrefill } from '@/lib/order-prefill-types'

export async function getOrderPrefill(): Promise<OrderPrefill | null> {
  const supabase = await createClient()

  const { data: claims } = await supabase.auth.getClaims()
  const authId = claims?.claims?.sub
  if (!authId) return null

  const { data: customer } = await supabase
    .from('customers')
    .select(
      'id, name, email, phone, ship_street, ship_apt, ship_city, ship_state, ship_zip',
    )
    .eq('auth_id', authId)
    .maybeSingle()

  if (!customer) return null

  // Dietary notes are the one field NOT on the customer row — they belong to an
  // order, and there is no column for "what this person never wants". Read the
  // most recent one instead. Cancelled orders still count: the restriction was
  // true even if the order was called off.
  const { data: lastOrder } = await supabase
    .from('orders')
    .select('dietary_notes')
    .eq('customer_id', customer.id)
    .not('dietary_notes', 'is', null)
    .order('placed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // `|| undefined` rather than `??`: a column that was written as '' should be
  // treated as unknown, not as a value worth prefilling.
  return {
    dietaryNotes: lastOrder?.dietary_notes || undefined,
    custName: customer.name || undefined,
    custEmail: customer.email || undefined,
    custPhone: customer.phone || undefined,
    streetAddress: customer.ship_street || undefined,
    aptSuite: customer.ship_apt || undefined,
    city: customer.ship_city || undefined,
    state: customer.ship_state || undefined,
    zipCode: customer.ship_zip || undefined,
  }
}
