import 'server-only'

/**
 * Which Wednesday a new cycle defaults to.
 *
 * Wednesday is the day Scraps buys the vegetables, so it is the first thing that
 * happens in a week and the natural thing to name the week after. Deliveries run
 * Thursday to Saturday and live in delivery_windows.starts_at — cycle_date does
 * not encode them, and cannot: three delivery days cannot fit in one date column.
 *
 * cycle_date carries a unique index, so anchoring every week to the same weekday
 * also keeps that key predictable: one row per shopping trip.
 */

/** Kansas City. Hardcoded because the business is in one place. */
const TZ = 'America/Chicago'

const WEDNESDAY = 3 // Sunday = 0

/**
 * Today's calendar date in Kansas City as YYYY-MM-DD, wherever the server runs.
 *
 * Vercel runs UTC, so `new Date().getDay()` on a Tuesday at 7pm Central is
 * already Wednesday in UTC — that would silently hand back the wrong week.
 * en-CA formats as ISO YYYY-MM-DD, which is also what the date input wants.
 */
function todayInTz(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * The next Wednesday on or after today, as YYYY-MM-DD.
 *
 * On a Wednesday it returns that same day rather than jumping a week out: she
 * may well be setting the week up the morning she shops.
 *
 * Date arithmetic runs on a UTC-noon anchor so that adding days cannot cross a
 * DST boundary and land on the previous evening. The result is a plain calendar
 * date with no time component, which is what the `date` column stores.
 */
export function nextWednesday(now: Date = new Date()): string {
  const [y, m, d] = todayInTz(now).split('-').map(Number)

  // Noon UTC: far enough from either midnight that adding whole days cannot
  // tip the result into an adjacent date. The weekday is read back off this
  // anchor rather than from `now`, so it reflects the Kansas City date.
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  const daysAhead = (WEDNESDAY - anchor.getUTCDay() + 7) % 7
  anchor.setUTCDate(anchor.getUTCDate() + daysAhead)

  return anchor.toISOString().slice(0, 10)
}
