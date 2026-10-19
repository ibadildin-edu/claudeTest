import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatCompact,
  formatDateRange,
  formatDayMonth,
  formatDelta,
  formatHourRange,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPct,
  formatTime,
  formatWeekday,
  pluralize,
} from './format'

// Intl puts no-break spaces between groups and before units.
const nbsp = (value: string) => value.replace(/ /g, ' ')
// Spaces inside dates depend on the ICU version, so they are compared loosely.
const plain = (value: string) => value.replace(/[  ]/g, ' ')

describe('numbers and money', () => {
  it('formats integers with ru-RU grouping', () => {
    expect(formatNumber(20261)).toBe(nbsp('20 261'))
    expect(formatNumber(5.84, 1)).toBe('5,8')
  })

  it('formats whole tenge', () => {
    expect(formatMoney(2598)).toBe(nbsp('2 598 ₸'))
    expect(formatMoney(197500)).toBe(nbsp('197 500 ₸'))
  })

  it('formats compact amounts like the design', () => {
    expect(formatMoneyCompact(52_600_000)).toBe(nbsp('52,6 млн ₸'))
    expect(formatCompact(750_000)).toBe(nbsp('750 тыс'))
    expect(formatCompact(1_000_000)).toBe(nbsp('1 млн'))
    expect(formatCompact(900)).toBe('900')
  })

  it('switches to the next unit instead of printing «1000 тыс»', () => {
    expect(formatCompact(999_960)).toBe(nbsp('1 млн'))
  })

  it('formats percentages and signed deltas', () => {
    expect(formatPct(55)).toBe('55%')
    expect(formatPct(18.5)).toBe('18,5%')
    expect(formatDelta(9.4)).toBe('+9,4%')
    expect(formatDelta(-4.9)).toBe('−4,9%')
    expect(formatDelta(0)).toBe('0%')
  })

  it('picks the Russian plural form', () => {
    const forms = { one: 'заказ', few: 'заказа', many: 'заказов' }
    expect(pluralize(1, forms)).toBe('заказ')
    expect(pluralize(3, forms)).toBe('заказа')
    expect(pluralize(16, forms)).toBe('заказов')
    expect(pluralize(21, forms)).toBe('заказ')
    expect(pluralize(5.8, forms)).toBe('заказа')
  })
})

describe('dates', () => {
  it('formats calendar dates without the trailing dot', () => {
    expect(plain(formatDayMonth('2026-07-16'))).toBe('16 июл')
    expect(plain(formatDateRange('2026-07-16', '2026-10-13'))).toBe('16 июл — 13 окт 2026')
    expect(plain(formatDateRange('2026-10-13', '2026-10-13'))).toBe('13 окт 2026')
  })

  it('shows instants in the Almaty time zone', () => {
    expect(formatTime('2026-10-14T07:59:30Z')).toBe('12:59')
  })

  it('names weekdays starting from Monday = 0', () => {
    expect(formatWeekday(0, 'short')).toBe('Пн')
    expect(formatWeekday(6, 'short')).toBe('Вс')
    expect(formatWeekday(1, 'long')).toBe('вторник')
  })

  it('formats hours and opening times', () => {
    expect(formatHourRange(15)).toBe('15:00–16:00')
    expect(formatHourRange(7)).toBe('07:00–08:00')
    expect(formatClock('22:00:00')).toBe('22:00')
  })
})
