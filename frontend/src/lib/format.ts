import { APP_TIMEZONE, parseIsoDate } from './dates'

const LOCALE = 'ru-RU'
const NBSP = ' '
const MINUS = '−'
const CURRENCY = '₸'

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const decimalFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })
const deltaFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const pluralRules = new Intl.PluralRules(LOCALE)

const COMPACT_UNITS = [
  { size: 1e9, label: 'млрд' },
  { size: 1e6, label: 'млн' },
  { size: 1e3, label: 'тыс' },
] as const

/** `20 261`, or `5,8` with fractionDigits = 1. */
export function formatNumber(value: number, fractionDigits: 0 | 1 = 0): string {
  return (fractionDigits === 0 ? integerFormat : decimalFormat).format(value)
}

/** `2 598 ₸`. Amounts are whole tenge. */
export function formatMoney(value: number): string {
  return `${integerFormat.format(value)}${NBSP}${CURRENCY}`
}

/** `52,6 млн`, `750 тыс`, `900`. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  // 999 950 would round to "1000 тыс", so switch to the bigger unit a bit early.
  const unit = COMPACT_UNITS.find(({ size }) => abs >= size * 0.99995)
  if (!unit) return integerFormat.format(value)
  return `${decimalFormat.format(value / unit.size)}${NBSP}${unit.label}`
}

/** `52,6 млн ₸`. */
export function formatMoneyCompact(value: number): string {
  return `${formatCompact(value)}${NBSP}${CURRENCY}`
}

/** `55%`, `18,5%`. */
export function formatPct(value: number): string {
  return `${decimalFormat.format(value)}%`
}

/** `+9,4%`, `−4,9%`, `0%`. */
export function formatDelta(value: number): string {
  return `${deltaFormat.format(value).replace('-', MINUS)}%`
}

export interface PluralForms {
  one: string
  few: string
  many: string
}

/** Russian plural: 1 заказ, 2 заказа, 5 заказов, 5,8 заказа. */
export function pluralize(count: number, forms: PluralForms): string {
  const rule = pluralRules.select(count)
  if (rule === 'one') return forms.one
  if (rule === 'many') return forms.many
  return forms.few
}

// Calendar dates (`YYYY-MM-DD`) are parsed as UTC midnight and formatted in UTC,
// so the day never shifts. Instants (`createdAt`) are formatted in APP_TIMEZONE.
const dayMonthFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const yearFormat = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', timeZone: 'UTC' })
const fullDayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE })
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: APP_TIMEZONE,
})
const weekdayShortFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' })
const weekdayLongFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' })

/** 2024-01-01 is a Monday, matching weekday 0 in the heatmap API. */
const MONDAY_UTC = Date.UTC(2024, 0, 1)

function stripDot(value: string): string {
  return value.replace(/\.$/, '').replace(/\. /g, ' ')
}

/** `16 июл`. */
export function formatDayMonth(isoDate: string): string {
  return stripDot(dayMonthFormat.format(parseIsoDate(isoDate)))
}

/** `вт, 13 октября`. */
export function formatDayFull(isoDate: string): string {
  return fullDayFormat.format(parseIsoDate(isoDate))
}

/** `16 июл — 13 окт 2026`. */
export function formatDateRange(dateFrom: string, dateTo: string): string {
  const year = yearFormat.format(parseIsoDate(dateTo))
  if (dateFrom === dateTo) return `${formatDayMonth(dateTo)} ${year}`
  return `${formatDayMonth(dateFrom)} — ${formatDayMonth(dateTo)} ${year}`
}

/** `12:46` in APP_TIMEZONE. */
export function formatTime(isoDateTime: string): string {
  return timeFormat.format(new Date(isoDateTime))
}

/** `14 окт 2026, 12:46` in APP_TIMEZONE. */
export function formatDateTime(isoDateTime: string): string {
  return stripDot(dateTimeFormat.format(new Date(isoDateTime)).replace(' г.', ''))
}

/** Weekday 0 = Monday: `Пн` or `понедельник`. */
export function formatWeekday(weekday: number, style: 'short' | 'long'): string {
  const date = new Date(MONDAY_UTC + weekday * 86_400_000)
  if (style === 'long') return weekdayLongFormat.format(date)
  const short = weekdayShortFormat.format(date)
  return short.charAt(0).toUpperCase() + short.slice(1)
}

function pad(hour: number): string {
  return String(hour).padStart(2, '0')
}

/** `15:00–16:00`. */
export function formatHourRange(hour: number): string {
  return `${pad(hour)}:00–${pad(hour + 1)}:00`
}

/** `07:00:00` → `07:00`. */
export function formatClock(time: string): string {
  return time.slice(0, 5)
}
