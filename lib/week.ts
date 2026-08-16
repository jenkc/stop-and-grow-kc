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
/**
 * A Kansas City wall-clock date and time as a UTC ISO timestamp.
 *
 * "2026-08-20" + "10:00" means 10am in Kansas City, always. Naively building
 * `new Date('2026-08-20T10:00')` resolves against the *server's* zone — on
 * Vercel that is UTC, so the window would land at 5am Central and sort wrong on
 * the runsheet.
 *
 * The offset cannot be hardcoded: Kansas City is UTC-5 in summer and UTC-6 in
 * winter, and a cycle can be created on either side of a changeover. So the
 * offset is measured for that specific instant instead. Guessing UTC first is
 * safe: the correction is derived from what the guess actually formats to in
 * Chicago, which is exact for both offsets.
 */
export function toKcTimestamp(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)

  const guess = Date.UTC(y, m - 1, d, hh, mm)

  // What that instant reads as on a Chicago clock.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(guess))

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asChicago = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
  )

  // The gap between them is the offset; add it back to land on the wall clock.
  return new Date(guess + (guess - asChicago)).toISOString()
}

/**
 * The day after a cycle's date — Thursday for a Wednesday week, and the first
 * of the three delivery days. Used to pre-fill the "Add a time" day field so
 * the common case needs no date picking at all.
 *
 * Takes a plain YYYY-MM-DD and returns one, with no timezone involved: this is
 * calendar arithmetic on a date the caller already has.
 */
export function dayAfter(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  anchor.setUTCDate(anchor.getUTCDate() + 1)
  return anchor.toISOString().slice(0, 10)
}

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
