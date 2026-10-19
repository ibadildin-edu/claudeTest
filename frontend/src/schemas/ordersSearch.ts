import { z } from 'zod'
import type { OrderSort, OrderStatus, OrdersQuery } from '@/api/types'

export const ORDER_SORTS = [
  '-createdAt',
  'createdAt',
  '-totalAmount',
  'totalAmount',
  '-id',
  'id',
] as const satisfies readonly OrderSort[]

const ORDER_STATUSES = ['preparing', 'completed', 'cancelled'] as const satisfies readonly OrderStatus[]

export const DEFAULT_ORDER_SORT: OrderSort = '-createdAt'
export const ORDERS_PAGE_SIZE = 20

// URL params are user input: anything invalid falls back to "no filter" instead of a 422 from the API.
const optionalId = z.coerce.number().int().positive().optional().catch(undefined)
const optionalAmount = z.coerce.number().int().nonnegative().optional().catch(undefined)
const optionalDate = z.iso.date().optional().catch(undefined)

export const ordersSearchSchema = z.object({
  locationId: optionalId,
  categoryId: optionalId,
  productId: optionalId,
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  minTotal: optionalAmount,
  maxTotal: optionalAmount,
  sort: z.enum(ORDER_SORTS).catch(DEFAULT_ORDER_SORT),
  page: z.coerce.number().int().positive().catch(1),
})

export type OrdersSearch = z.output<typeof ordersSearchSchema>

/** Filters of the orders page live in the URL: `?status=completed&minTotal=3000&page=2`. */
export function parseOrdersSearch(params: URLSearchParams): OrdersSearch {
  const search = ordersSearchSchema.parse(Object.fromEntries(params))
  // A reversed range is a typo, not "nothing found".
  if (search.dateFrom && search.dateTo && search.dateFrom > search.dateTo) {
    ;[search.dateFrom, search.dateTo] = [search.dateTo, search.dateFrom]
  }
  if (search.minTotal !== undefined && search.maxTotal !== undefined && search.minTotal > search.maxTotal) {
    ;[search.minTotal, search.maxTotal] = [search.maxTotal, search.minTotal]
  }
  return search
}

/** Back to URL params; defaults are left out to keep links short. */
export function toOrdersSearchParams(search: OrdersSearch): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue
    if (key === 'sort' && value === DEFAULT_ORDER_SORT) continue
    if (key === 'page' && value === 1) continue
    params.set(key, String(value))
  }
  return params
}

export function toOrdersQuery(search: OrdersSearch): OrdersQuery {
  return { ...search, pageSize: ORDERS_PAGE_SIZE }
}

export function hasActiveFilters(search: OrdersSearch): boolean {
  const { sort: _sort, page: _page, ...filters } = search
  return Object.values(filters).some((value) => value !== undefined)
}
