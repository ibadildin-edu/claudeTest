import { describe, expect, it } from 'vitest'
import { addDays, daysInRange, isOpenAt, lastDaysRange, toAppDate } from './dates'
import { parseId } from './ids'

describe('dates in APP_TIMEZONE', () => {
  it('uses the Almaty calendar day, not the UTC one', () => {
    // 19:30 UTC is already 00:30 next day in Almaty (UTC+5).
    expect(toAppDate(new Date('2026-10-13T19:30:00Z'))).toBe('2026-10-14')
    expect(toAppDate(new Date('2026-10-13T18:30:00Z'))).toBe('2026-10-13')
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('builds the last N days including today, like the backend', () => {
    expect(lastDaysRange(30, '2026-10-14')).toEqual({ dateFrom: '2026-09-15', dateTo: '2026-10-14' })
    expect(lastDaysRange(90, '2026-10-13')).toEqual({ dateFrom: '2026-07-16', dateTo: '2026-10-13' })
    expect(daysInRange('2026-07-16', '2026-10-13')).toBe(90)
  })

  it('checks opening hours in Almaty time', () => {
    // 03:00 UTC = 08:00 in Almaty.
    expect(isOpenAt('07:00:00', '22:00:00', new Date('2026-10-14T03:00:00Z'))).toBe(true)
    // 17:30 UTC = 22:30 in Almaty.
    expect(isOpenAt('07:00:00', '22:00:00', new Date('2026-10-14T17:30:00Z'))).toBe(false)
  })
})

describe('parseId', () => {
  it('accepts positive integers only', () => {
    expect(parseId('42')).toBe(42)
    expect(parseId('0')).toBeNull()
    expect(parseId('abc')).toBeNull()
    expect(parseId('1.5')).toBeNull()
    expect(parseId(undefined)).toBeNull()
  })
})
