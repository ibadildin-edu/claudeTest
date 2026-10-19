import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { lastDaysRange, todayIso } from '@/lib/dates'

export const PERIODS = ['7d', '30d', '90d'] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** UI state of the global header filters. Server data lives in the RTK Query cache only. */
export interface FiltersState {
  period: Period
  /** `null` — the whole network. */
  locationId: number | null
  /** Poll the live feed of recent orders. */
  live: boolean
}

export const initialFiltersState: FiltersState = {
  period: '30d',
  locationId: null,
  live: true,
}

export const filtersSlice = createSlice({
  name: 'filters',
  initialState: initialFiltersState,
  reducers: {
    periodChanged(state, action: PayloadAction<Period>) {
      state.period = action.payload
    },
    locationChanged(state, action: PayloadAction<number | null>) {
      state.locationId = action.payload
    },
    liveChanged(state, action: PayloadAction<boolean>) {
      state.live = action.payload
    },
  },
  selectors: {
    selectPeriod: (state) => state.period,
    selectLocationId: (state) => state.locationId,
    selectLive: (state) => state.live,
  },
})

export const { periodChanged, locationChanged, liveChanged } = filtersSlice.actions
export const { selectPeriod, selectLocationId, selectLive } = filtersSlice.selectors

/**
 * Period → `{dateFrom, dateTo}` in the Almaty zone. Memoized on the period, so components
 * get a stable object (and `memo` charts do not re-render) until the period changes.
 */
export const selectDateRange = createSelector([selectPeriod], (period) =>
  lastDaysRange(PERIOD_DAYS[period], todayIso()),
)

/** Query args for /analytics/*: date range plus the selected location. */
export const selectAnalyticsParams = createSelector(
  [selectDateRange, selectLocationId],
  (range, locationId) => ({ ...range, locationId: locationId ?? undefined }),
)

export const filtersReducer = filtersSlice.reducer
