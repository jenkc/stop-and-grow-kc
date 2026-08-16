/**
 * Selectable times for a delivery window: 8:00am to 8:00pm on the half hour.
 *
 * Deliberately NOT 'server-only', unlike lib/week.ts — the <select> that renders
 * these lives in a client component, and the action that validates a submitted
 * value runs on the server. Both import this, so it has to be neutral. It is a
 * pure constant with no data access, so that is safe.
 *
 * `value` is 24-hour "HH:MM": what an <option> submits, and what combines with a
 * date to build a timestamp. `label` is 12-hour, which is how a delivery time is
 * actually read around here.
 *
 * A fixed list rather than a free time field: these are business hours, and a
 * dropdown cannot produce 3:07am from a mistyped digit. 8pm is the last start
 * offered — an end time later than that is outside anything Scraps runs.
 */

export type TimeOption = { value: string; label: string }

const FIRST_MINUTE = 8 * 60 // 8:00am
const LAST_MINUTE = 20 * 60 // 8:00pm
const STEP_MINUTES = 30

export const WINDOW_TIMES: TimeOption[] = (() => {
  const out: TimeOption[] = []
  for (let minutes = FIRST_MINUTE; minutes <= LAST_MINUTE; minutes += STEP_MINUTES) {
    const h24 = Math.floor(minutes / 60)
    const m = minutes % 60
    // 0 and 12 both map to 12 — "12:00pm", never "0:00pm".
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    const suffix = h24 < 12 ? 'am' : 'pm'
    const mm = String(m).padStart(2, '0')

    out.push({
      value: `${String(h24).padStart(2, '0')}:${mm}`,
      label: `${h12}:${mm}${suffix}`,
    })
  }
  return out
})()

/** Guard for a submitted time — the form is a public POST like any other. */
export function isWindowTime(value: string): boolean {
  return WINDOW_TIMES.some((t) => t.value === value)
}

/** "14:30" -> "2:30pm". Falls back to the raw value if it is not on the list. */
export function timeLabel(value: string): string {
  return WINDOW_TIMES.find((t) => t.value === value)?.label ?? value
}
