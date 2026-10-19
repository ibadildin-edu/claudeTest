import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const API_BASE_URL = '/api/v1'

/** Optional filters are often `undefined` or `null`; the API must not receive them as "null". */
function serializeParams(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, String(value))
  }
  return search.toString()
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, paramsSerializer: serializeParams }),
  tagTypes: ['Product', 'Order', 'Location', 'Category', 'Analytics'],
  endpoints: () => ({}),
})

export const LIST_ID = 'LIST'
