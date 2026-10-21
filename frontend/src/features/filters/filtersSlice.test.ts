import { describe, expect, it } from 'vitest'
import { daysInRange, todayIso } from '@/lib/dates'
import {
  filtersReducer,
  initialFiltersState,
  locationChanged,
  periodChanged,
  selectAnalyticsParams,
  selectDateRange,
  type FiltersState,
} from './filtersSlice'

const stateWith = (filters: Partial<FiltersState>) => ({ filters: { ...initialFiltersState, ...filters } })

describe('filtersSlice', () => {
  it('stores the global header filters', () => {
    let state = filtersReducer(undefined, periodChanged('7d'))
    state = filtersReducer(state, locationChanged(3))
    expect(state).toEqual({ period: '7d', locationId: 3 })

    expect(filtersReducer(state, locationChanged(null)).locationId).toBeNull()
  })

  it('turns the period into an inclusive date range ending today', () => {
    const range = selectDateRange(stateWith({ period: '90d' }))
    expect(range.dateTo).toBe(todayIso())
    expect(daysInRange(range.dateFrom, range.dateTo)).toBe(90)
  })

  it('returns the same params object while filters do not change', () => {
    const state = stateWith({ period: '30d', locationId: null })
    const first = selectAnalyticsParams(state)
    expect(selectAnalyticsParams({ filters: { ...state.filters } })).toBe(first)
    expect(first.locationId).toBeUndefined()

    const withLocation = selectAnalyticsParams(stateWith({ period: '30d', locationId: 2 }))
    expect(withLocation).not.toBe(first)
    expect(withLocation.locationId).toBe(2)
  })
})
