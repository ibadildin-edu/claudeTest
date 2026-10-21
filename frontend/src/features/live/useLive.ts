import type { SubscriptionOptions } from '@reduxjs/toolkit/query'
import { useGetSimulatorStatusQuery } from '@/api/simulatorApi'

/** While Live is on, dashboard data is refetched this often. */
export const LIVE_REFRESH_MS = 5_000

const LIVE_POLLING: SubscriptionOptions = { pollingInterval: LIVE_REFRESH_MS, skipPollingIfUnfocused: true }
const NO_POLLING: SubscriptionOptions = {}

/**
 * Live is the order simulator running on the server, not a UI flag. Its status is polled even
 * while it is off, so a simulator started from another tab turns Live on here as well.
 * Only the picked fields re-render the component, not every new `ordersCreated`.
 */
export function useLiveStatus() {
  return useGetSimulatorStatusQuery(undefined, {
    ...LIVE_POLLING,
    selectFromResult: ({ data, isLoading, isError, error }) => ({
      running: data?.running ?? false,
      idleReason: data?.idleReason ?? null,
      isLoading,
      isError,
      error,
    }),
  })
}

/**
 * Query options for dashboard data: poll every 5 seconds while Live is on.
 * Cards dim only while `currentData` is missing (a filter changed), not on these background refetches.
 */
export function useLivePolling(): SubscriptionOptions {
  const { running } = useLiveStatus()
  return running ? LIVE_POLLING : NO_POLLING
}
