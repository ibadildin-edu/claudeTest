import { baseApi } from './baseApi'
import type { SimulatorStatus } from './types'

export const simulatorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSimulatorStatus: build.query<SimulatorStatus, void>({
      query: () => '/simulator/status',
    }),
    /** POST /simulator/start or /simulator/stop. */
    setSimulatorRunning: build.mutation<SimulatorStatus, boolean>({
      query: (running) => ({ url: running ? '/simulator/start' : '/simulator/stop', method: 'POST' }),
      // Start and stop give out orders that are still «preparing».
      invalidatesTags: ['Order', 'Analytics'],
      async onQueryStarted(_running, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          // The response is the new status: no extra request, the toggle switches at once.
          dispatch(simulatorApi.util.upsertQueryData('getSimulatorStatus', undefined, data))
        } catch {
          // The failed mutation carries the error; the cached status stays as it was.
        }
      },
    }),
  }),
})

export const { useGetSimulatorStatusQuery, useSetSimulatorRunningMutation } = simulatorApi
