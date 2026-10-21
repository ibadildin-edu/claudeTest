import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { Link } from 'react-router'
import { useGetKpiQuery } from '@/api/analyticsApi'
import { useGetOrdersQuery } from '@/api/ordersApi'
import type { OrdersQuery, SimulatorIdleReason } from '@/api/types'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLivePolling, useLiveStatus } from '@/features/live/useLive'
import { todayIso } from '@/lib/dates'
import { formatMoney, formatNumber } from '@/lib/format'
import { RecentOrdersList } from './RecentOrdersList'

interface RecentOrdersPanelProps {
  locationId: number | null
}

const RECENT_LIMIT = 9

const IDLE_REASON_TEXT: Record<SimulatorIdleReason, string> = {
  closed: 'Все точки сейчас закрыты. Новые заказы появятся, когда откроется первая.',
  no_locations: 'В сети нет ни одной точки, заказы создавать негде.',
  no_products: 'В меню нет активных позиций, заказы создавать не из чего.',
  error: 'Симулятор не смог создать заказ и попробует снова.',
}

/**
 * Live feed: the first page of /orders sorted by time plus today's KPI.
 * Both are polled every 5 seconds while the order simulator is running.
 */
export const RecentOrdersPanel = memo(function RecentOrdersPanel({ locationId }: RecentOrdersPanelProps) {
  const { running: live, idleReason } = useLiveStatus()
  const pollingOptions = useLivePolling()
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

  // currentData, not data: after a location switch the previous location's orders are not
  // animated out, the feed shows a skeleton until its own orders arrive.
  const items = orders.currentData?.items
  const allOrdersLink = locationId === null ? '/orders' : `/orders?locationId=${locationId}`

  let list
  if (orders.isError) {
    list = <ErrorState error={orders.error} onRetry={orders.refetch} />
  } else if (!items) {
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
  } else if (items.length === 0) {
    list = (
      <EmptyState
        title="Заказов пока нет"
        description={live ? 'Новые заказы появятся здесь автоматически.' : 'Включите Live, чтобы пошли новые заказы.'}
      />
    )
  } else {
    list = <RecentOrdersList orders={items} />
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

      {live && idleReason && (
        <p role="status" className="mb-3 rounded-2xl bg-cream-100 px-4 py-2.5 text-sm text-espresso-500">
          {IDLE_REASON_TEXT[idleReason]}
        </p>
      )}

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
