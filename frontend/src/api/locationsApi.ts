import { baseApi, LIST_ID } from './baseApi'
import type { Location } from './types'

export const locationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLocations: build.query<Location[], void>({
      query: () => '/locations',
      providesTags: (result) => [
        { type: 'Location', id: LIST_ID },
        ...(result?.map(({ id }) => ({ type: 'Location' as const, id })) ?? []),
      ],
    }),
    getLocation: build.query<Location, number>({
      query: (id) => `/locations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Location', id }],
    }),
  }),
})

export const { useGetLocationsQuery, useGetLocationQuery } = locationsApi
