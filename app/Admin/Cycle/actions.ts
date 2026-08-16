'use server'

import { revalidatePath } from 'next/cache'
import { getAdminEmail } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { toKcTimestamp } from '@/lib/week'
import { isWindowTime } from '@/lib/window-times'
import type { AdminActionState } from '@/app/Admin/actions'
import type { Enums } from '@/lib/supabase/database.types'

/**
 * Setting up the week.
 *
 * Same rule as app/Admin/actions.ts: every function re-checks getAdminEmail(),
 * because a Server Action is a public POST endpoint and the layout gate only
 * governs what renders. Opening ordering is the highest-value write in the app
 * — it decides whether the storefront is live — so it gets the same treatment
 * as the money actions.
 */

const FORBIDDEN: AdminActionState = { error: 'Not authorized.' }

function revalidateAll() {
  revalidatePath('/Admin/Cycle')
  revalidatePath('/Admin/Runsheet')
  revalidatePath('/Admin')
  // The public form reads the cycle to decide whether to render at all.
  revalidatePath('/Order')
}

export async function createCycle(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await getAdminEmail())) return FORBIDDEN

  const cycleDate = String(formData.get('cycleDate') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cycleDate)) {
    return { error: 'Pick a date for this week.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('distribution_cycles')
    .insert({ cycle_date: cycleDate, title: title || null, status: 'draft' })

  if (error) {
    // cycle_date is unique — one week per date, so a repeat is a mistake worth
    // naming rather than a generic failure.
    if (error.code === '23505') {
      return { error: 'A week already exists for that date.' }
    }
    console.error('[cycle] create failed:', error)
    return { error: 'Could not create that week.' }
  }

  revalidateAll()
  return { ok: 'Week created.' }
}

export async function setCycleStatus(
  cycleId: string,
  status: Enums<'cycle_status'>,
): Promise<AdminActionState> {
  if (!(await getAdminEmail())) return FORBIDDEN

  const ALLOWED = ['draft', 'open', 'closed', 'fulfilled'] as const
  if (!ALLOWED.includes(status)) return { error: 'Unknown status.' }

  const admin = createAdminClient()

  // Only one week can take orders at a time. getOrderingCycle() picks the
  // earliest open cycle, so two would silently route orders into whichever
  // sorted first — close the others rather than leaving that to chance.
  if (status === 'open') {
    const { error: closeError } = await admin
      .from('distribution_cycles')
      .update({ status: 'closed' })
      .eq('status', 'open')
      .neq('id', cycleId)

    if (closeError) {
      console.error('[cycle] could not close other open cycles:', closeError)
      return { error: 'Could not close the previous week.' }
    }
  }

  const { error } = await admin
    .from('distribution_cycles')
    .update({ status })
    .eq('id', cycleId)

  if (error) {
    console.error('[cycle] status update failed:', error)
    return { error: 'Could not update that week.' }
  }

  revalidateAll()
  return { ok: status === 'open' ? 'Ordering is open.' : `Week marked ${status}.` }
}

export async function addWindow(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await getAdminEmail())) return FORBIDDEN

  const cycleId = String(formData.get('cycleId') ?? '')
  const kind = String(formData.get('kind') ?? '')
  const label = String(formData.get('label') ?? '').trim()
  const windowDate = String(formData.get('windowDate') ?? '')
  const startsTime = String(formData.get('startsTime') ?? '')
  const endsTime = String(formData.get('endsTime') ?? '')

  if (kind !== 'pickup' && kind !== 'delivery') {
    return { error: 'Choose pickup or delivery.' }
  }
  if (!label) return { error: 'Give the time a label, like “10:00–12:30pm”.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(windowDate)) {
    return { error: 'Pick the day this time is on.' }
  }
  // The <select> only offers these, but it posts like any other form — a value
  // off the list would otherwise become a timestamp nobody chose.
  if (!isWindowTime(startsTime) || !isWindowTime(endsTime)) {
    return { error: 'Choose a start and end time.' }
  }
  if (endsTime <= startsTime) {
    // Zero-padded 24-hour strings, so a plain string compare is a clock compare.
    return { error: 'The end time must be after the start time.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('delivery_windows').insert({
    cycle_id: cycleId,
    kind,
    label,
    starts_at: toKcTimestamp(windowDate, startsTime),
    ends_at: toKcTimestamp(windowDate, endsTime),
  })

  if (error) {
    console.error('[cycle] addWindow failed:', error)
    return { error: 'Could not add that time.' }
  }

  revalidateAll()
  return { ok: 'Time added.' }
}

export async function deleteWindow(windowId: string): Promise<AdminActionState> {
  if (!(await getAdminEmail())) return FORBIDDEN

  const admin = createAdminClient()

  // Orders reference windows with on delete set null, so deleting a booked
  // window silently strands its orders under "No time set" on the runsheet.
  // Refuse instead and let her reassign deliberately.
  //
  // Cancelled orders do not count: they are not stops, they do not appear on
  // the runsheet, and blocking on one would mean a cancelled order could pin a
  // window in place forever. This must match the count shown on /Admin/Cycle,
  // or the page says "1 order" while deletion refuses citing 2.
  const { count } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('window_id', windowId)
    .neq('status', 'cancelled')

  if ((count ?? 0) > 0) {
    return {
      error: `${count} order(s) are booked into that time. Move them before removing it.`,
    }
  }

  const { error } = await admin
    .from('delivery_windows')
    .delete()
    .eq('id', windowId)

  if (error) {
    console.error('[cycle] deleteWindow failed:', error)
    return { error: 'Could not remove that time.' }
  }

  revalidateAll()
  return { ok: 'Time removed.' }
}