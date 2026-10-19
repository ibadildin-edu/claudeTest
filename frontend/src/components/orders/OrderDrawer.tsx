import { SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { skipToken } from '@reduxjs/toolkit/query'
import { isNotFoundError } from '@/api/errors'
import { useGetOrderQuery } from '@/api/ordersApi'
import { useGetCategoriesQuery } from '@/api/categoriesApi'
import { ColorDot } from '@/components/ui/ColorDot'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseId } from '@/lib/ids'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { OrderStatusBadge } from './OrderStatusBadge'

/** Nested route `/orders/:orderId`: a side panel over the table, the filters in the URL stay put. */
export function OrderDrawer() {
  const { orderId: rawId } = useParams()
  const orderId = parseId(rawId)
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data: order, isLoading, isError, error, refetch } = useGetOrderQuery(orderId ?? skipToken)
  const { data: categories = [] } = useGetCategoriesQuery()

  const handleClose = useCallback(
    () => navigate({ pathname: '/orders', search }, { preventScrollReset: true }),
    [navigate, search],
  )

  let body
  if (orderId === null || isNotFoundError(error)) {
    body = <EmptyState icon={SearchX} title="Заказ не найден" description={`Заказа «${rawId}» нет в базе.`} />
  } else if (isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка заказа" className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-24" />
      </div>
    )
  } else if (isError || !order) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else {
    body = (
      <div className="space-y-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
          <dt className="text-espresso-400">Статус</dt>
          <dd>
            <OrderStatusBadge status={order.status} />
          </dd>
          <dt className="text-espresso-400">Время</dt>
          <dd className="tabular-nums">{formatDateTime(order.createdAt)}</dd>
          <dt className="text-espresso-400">Точка</dt>
          <dd>{order.locationName}</dd>
          <dt className="text-espresso-400">Позиций</dt>
          <dd className="tabular-nums">{formatNumber(order.itemsCount)}</dd>
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-espresso-400">Состав заказа</h3>
          <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-300 px-4">
            {order.items.map((item) => {
              const category = categories.find(({ id }) => id === item.categoryId)
              return (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {category && <ColorDot color={category.color} />}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.productName}</span>
                      <span className="text-espresso-400 tabular-nums">
                        {formatNumber(item.quantity)} × {formatMoney(item.unitPrice)}
                      </span>
                    </span>
                  </span>
                  <span className="font-bold whitespace-nowrap tabular-nums">{formatMoney(item.lineTotal)}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cream-200 px-4 py-3">
          <span className="font-semibold">Итого</span>
          <span className="text-xl font-extrabold tabular-nums">{formatMoney(order.totalAmount)}</span>
        </div>
      </div>
    )
  }

  return (
    <Drawer title={orderId === null ? 'Заказ' : `Заказ #${orderId}`} onClose={handleClose}>
      {body}
    </Drawer>
  )
}
