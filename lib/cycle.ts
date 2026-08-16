import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Whether ordering is open, and for which week.
 *
 * There is exactly one gate and this is it. `/Order` calls it to decide whether
 * to render the form; placeOrder() calls it again to decide whether to accept a
 * submission. Those are not redundant — the page check is a courtesy to the
 * visitor, the action check is the enforcement. A disabled form still POSTs.
 *
 * Three conditions, all of which must hold:
 *
 *   status = 'open'          the switch Scraps flips
 *   now() >= orders_open_at  only if that timestamp is set
 *   now() <  orders_close_at only if that timestamp is set
 *
 * The timestamps are nullable and start null, so today this is purely manual.
 * Filling them in later turns on scheduling with no code change. The order-total
 * cap described in .agents/HANDOFF.md (2026-08-06) becomes a fourth condition
 * here rather than a new gate somewhere else — that is the point of centralising
 * it.
 *
 * Orders placed after close are rejected outright. They are not rolled into the
 * following week: the visitor chose a delivery window belonging to this cycle,
 * and silently moving them seven days is worse than telling them no.
 */

export type OpenCycle = {
  id: string
  cycle_date: string
  title: string | null
}

export type CycleGate =
  | { open: true; cycle: OpenCycle }
  | { open: false; reason: 'no_cycle' | 'not_yet_open' | 'closed' }

type CycleRow = Pick<
  Database['public']['Tables']['distribution_cycles']['Row'],
  'id' | 'cycle_date' | 'title' | 'status' | 'orders_open_at' | 'orders_close_at'
>

/**
 * The cycle customers are ordering into, or why they cannot.
 *
 * Reads with the session client: distribution_cycles_public_read exposes only
 * `open` cycles to anon, so a draft week is invisible here by policy rather than
 * by a filter this function has to remember to apply.
 */
export async function getOrderingCycle(): Promise<CycleGate> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('distribution_cycles')
    .select('id, cycle_date, title, status, orders_open_at, orders_close_at')
    .eq('status', 'open')
    .order('cycle_date', { ascending: true })
    .limit(1)
    .maybeSingle<CycleRow>()

  if (error) {
    // Fail closed. An unreadable cycle table must not become an open storefront
    // that accepts orders nobody is scheduled to deliver.
    console.error('[cycle] lookup failed:', error)
    return { open: false, reason: 'no_cycle' }
  }

  if (!data) return { open: false, reason: 'no_cycle' }

  const now = Date.now()

  if (data.orders_open_at && now < Date.parse(data.orders_open_at)) {
    return { open: false, reason: 'not_yet_open' }
  }

  if (data.orders_close_at && now >= Date.parse(data.orders_close_at)) {
    return { open: false, reason: 'closed' }
  }

  return {
    open: true,
    cycle: { id: data.id, cycle_date: data.cycle_date, title: data.title },
  }
}

/** What to tell a visitor when the form is not available. */
export function closedMessage(reason: 'no_cycle' | 'not_yet_open' | 'closed'): string {
  switch (reason) {
    case 'not_yet_open':
      return 'Ordering for this week has not opened yet. Check back soon.'
    case 'closed':
      return 'Ordering for this week is closed. Check back next week.'
    default:
      return 'Ordering is closed right now. Check back soon.'
  }
}