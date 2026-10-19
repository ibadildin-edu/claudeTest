import clsx from 'clsx'
import { SearchX } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Outlet, useParams, useSearchParams } from 'react-router'
import { useGetOrdersQuery } from '@/api/ordersApi'
import type { OrderSort } from '@/api/types'
import { OrdersFilters } from '@/components/orders/OrdersFilters'
import { OrdersTable } from '@/components/orders/OrdersTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseId } from '@/lib/ids'
import {
  DEFAULT_ORDER_SORT,
  hasActiveFilters,
  parseOrdersSearch,
  toOrdersQuery,
  toOrdersSearchParams,
  type OrdersSearch,
} from '@/schemas/ordersSearch'

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = useMemo(() => parseOrdersSearch(searchParams), [searchParams])
  const query = useMemo(() => toOrdersQuery(search), [search])
  const { data, isLoading, isFetching, isError, error, refetch } = useGetOrdersQuery(query)
  const activeOrderId = parseId(useParams().orderId)

  // Any filter change goes back to page 1; the patch may set the page explicitly.
  const updateSearch = useCallback(
    (patch: Partial<OrdersSearch>) =>
      setSearchParams((current) => toOrdersSearchParams({ ...parseOrdersSearch(current), page: 1, ...patch }), {
        preventScrollReset: true,
      }),
    [setSearchParams],
  )
  const handleReset = useCallback(
    () =>
      setSearchParams((current) => {
        // Reset filters but keep the chosen sort order.
        const { sort } = parseOrdersSearch(current)
        return new URLSearchParams(sort === DEFAULT_ORDER_SORT ? undefined : { sort })
      }),
    [setSearchParams],
  )
  const handleSortChange = useCallback((sort: OrderSort) => updateSearch({ sort }), [updateSearch])
  const handlePageChange = useCallback((page: number) => updateSearch({ page }), [updateSearch])
  const handleFirstPage = useCallback(() => updateSearch({ page: 1 }), [updateSearch])

  let body
  if (isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка заказов" className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-10" />
        ))}
      </div>
    )
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (data.items.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title={data.total > 0 ? 'На этой странице пусто' : 'Заказов не найдено'}
        description={hasActiveFilters(search) ? 'Попробуйте ослабить фильтры.' : undefined}
        action={
          data.total > 0 ? (
            <Button variant="secondary" onClick={handleFirstPage}>
              К первой странице
            </Button>
          ) : (
            hasActiveFilters(search) && (
              <Button variant="secondary" onClick={handleReset}>
                Сбросить фильтры
              </Button>
            )
          )
        }
      />
    )
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && 'opacity-60')}>
        <OrdersTable
          orders={data.items}
          sort={search.sort}
          onSortChange={handleSortChange}
          activeOrderId={activeOrderId}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <OrdersFilters search={search} onChange={updateSearch} onReset={handleReset} />
      </Card>

      <Card>
        {body}
        {data && data.total > 0 && (
          <div className="mt-5">
            <Pagination page={search.page} pageSize={data.pageSize} total={data.total} onPageChange={handlePageChange} />
          </div>
        )}
      </Card>

      {/* /orders/:orderId — the order drawer */}
      <Outlet />
    </div>
  )
}
