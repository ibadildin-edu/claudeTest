import { baseApi, LIST_ID } from './baseApi'
import type { Order, OrdersPage, OrdersQuery } from './types'

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<OrdersPage, OrdersQuery>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: (result) => [
        { type: 'Order', id: LIST_ID },
        ...(result?.items.map(({ id }) => ({ type: 'Order' as const, id })) ?? []),
      ],
    }),
    getOrder: build.query<Order, number>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
  }),
})

export const { useGetOrdersQuery, useGetOrderQuery } = ordersApi
