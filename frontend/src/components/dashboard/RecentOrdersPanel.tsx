import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { Link } from 'react-router'
import { useGetKpiQuery } from '@/api/analyticsApi'
import { useGetOrdersQuery } from '@/api/ordersApi'
import type { OrdersQuery } from '@/api/types'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { todayIso } from '@/lib/dates'
import { formatMoney, formatNumber } from '@/lib/format'
import { RecentOrderItem } from './RecentOrderItem'

interface RecentOrdersPanelProps {
  locationId: number | null
  live: boolean
}

const RECENT_LIMIT = 9
export const LIVE_POLLING_MS = 8_000

/**
 * Live feed. The backend has no /orders/recent yet, so the feed is the first page of /orders
 * sorted by time plus today's KPI; both are polled only while Live is on.
 */
export const RecentOrdersPanel = memo(function RecentOrdersPanel({ locationId, live }: RecentOrdersPanelProps) {
  const pollingOptions = { pollingInterval: live ? LIVE_POLLING_MS : 0, skipPollingIfUnfocused: true }
  const today = todayIso()

  const ordersArgs = useMemo<OrdersQuery>(
    () => ({ locationId: locationId ?? undefined, pageSize: RECENT_LIMIT, sort: '-createdAt' }),
    [locationId],
  )
  const todayArgs = useMemo(
    () => ({ dateFrom: today, dateTo: today, locationId: locationId ?? undefined }),
    [today, locationId],
  )
  const orders = useGetOrdersQuery(ordersArgs, pollingOptions)
  const todayKpi = useGetKpiQuery(todayArgs, pollingOptions)

  const allOrdersLink = locationId === null ? '/orders' : `/orders?locationId=${locationId}`

  let list
  if (orders.isLoading) {
    list = (
      <div aria-busy="true" aria-label="Загрузка заказов" className="space-y-5 px-4 py-3">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  } else if (orders.isError || !orders.data) {
    list = <ErrorState error={orders.error} onRetry={orders.refetch} />
  } else if (orders.data.items.length === 0) {
    list = <EmptyState title="Заказов пока нет" description="Новые заказы появятся здесь автоматически." />
  } else {
    list = (
      <ul className="space-y-1">
        {orders.data.items.map((order) => (
          <RecentOrderItem key={order.id} order={order} />
        ))}
      </ul>
    )
  }

  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between px-2 pt-1">
        <h2 className="text-lg font-bold tracking-tight">Последние заказы</h2>
        <span
          className={clsx(
            'flex items-center gap-1.5 text-xs font-bold tracking-wide',
            live ? 'text-brand-600' : 'text-espresso-300',
          )}
        >
          <span aria-hidden className={clsx('size-2 rounded-full', live ? 'animate-pulse bg-brand-500' : 'bg-cream-400')} />
          {live ? 'LIVE' : 'ПАУЗА'}
        </span>
      </div>

      <dl className="mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-cream-200 px-4 py-3">
        <div>
          <dt className="text-xs text-espresso-500">Заказов сегодня</dt>
          <dd className="mt-0.5 text-xl font-extrabold tabular-nums">
            {todayKpi.data ? formatNumber(todayKpi.data.ordersCount.value) : <Skeleton className="h-6 w-12" />}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-espresso-500">Выручка сегодня</dt>
          <dd className="mt-0.5 text-xl font-extrabold whitespace-nowrap tabular-nums">
            {todayKpi.data ? formatMoney(todayKpi.data.revenue.value) : <Skeleton className="h-6 w-24" />}
          </dd>
        </div>
      </dl>

      {list}

      <Link to={allOrdersLink} className={buttonClassName('soft', 'md', 'mt-4 h-12 w-full rounded-2xl text-[15px]')}>
        Все заказы
      </Link>
    </Card>
  )
})
