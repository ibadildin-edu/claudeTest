/** Same zone as the backend APP_TIMEZONE: days and hours of analytics are counted in it. */
export const APP_TIMEZONE = 'Asia/Almaty'

const MS_PER_DAY = 86_400_000

const isoDateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const clockParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function partsOf(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
}

/** Calendar date `YYYY-MM-DD` of the instant in APP_TIMEZONE. */
export function toAppDate(date: Date): string {
  const { year, month, day } = partsOf(isoDateParts, date)
  return `${year}-${month}-${day}`
}

export function todayIso(now: Date = new Date()): string {
  return toAppDate(now)
}

/** `YYYY-MM-DD` as a UTC midnight Date: safe for date arithmetic and for formatting with timeZone UTC. */
export function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysInRange(dateFrom: string, dateTo: string): number {
  return Math.round((parseIsoDate(dateTo).getTime() - parseIsoDate(dateFrom).getTime()) / MS_PER_DAY) + 1
}

export interface DateRange {
  dateFrom: string
  dateTo: string
}

/** The last `days` days including today, the same way the backend counts periods. */
export function lastDaysRange(days: number, today: string = todayIso()): DateRange {
  return { dateFrom: addDays(today, -(days - 1)), dateTo: today }
}

/** Time of day `HH:MM:SS` in APP_TIMEZONE. */
export function clockTimeInApp(now: Date = new Date()): string {
  const { hour, minute, second } = partsOf(clockParts, now)
  return `${hour}:${minute}:${second}`
}

/** Opening hours come from the API as `HH:MM:SS`, so plain string comparison works. */
export function isOpenAt(opensAt: string, closesAt: string, now: Date = new Date()): boolean {
  const time = clockTimeInApp(now)
  return time >= opensAt && time < closesAt
}
