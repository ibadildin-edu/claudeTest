import clsx from 'clsx'
import { useCallback, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { OrderListItem, OrderSort } from '@/api/types'
import { Table } from '@/components/ui/Table'
import { tdClassName, thClassName } from '@/components/ui/tableStyles'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { OrderStatusBadge } from './OrderStatusBadge'
import { SortableHeader } from './SortableHeader'

interface OrdersTableProps {
  orders: readonly OrderListItem[]
  sort: OrderSort
  onSortChange: (sort: OrderSort) => void
  activeOrderId?: number | null
}

export function OrdersTable({ orders, sort, onSortChange, activeOrderId = null }: OrdersTableProps) {
  const { search } = useLocation()
  const navigate = useNavigate()

  // The whole row opens the drawer; the link in the first cell keeps it keyboard- and middle-click-friendly.
  const handleRowClick = useCallback(
    (event: MouseEvent<HTMLTableRowElement>) => {
      if ((event.target as HTMLElement).closest('a')) return
      const { orderId } = event.currentTarget.dataset
      if (orderId) navigate({ pathname: orderId, search }, { preventScrollReset: true })
    },
    [navigate, search],
  )

  return (
    <Table>
      <thead>
        <tr>
          <SortableHeader field="id" label="Заказ" sort={sort} onSortChange={onSortChange} />
          <SortableHeader field="createdAt" label="Время" sort={sort} onSortChange={onSortChange} />
          <th scope="col" className={thClassName}>
            Точка
          </th>
          <th scope="col" className={thClassName}>
            Состав
          </th>
          <th scope="col" className={clsx(thClassName, 'text-right')}>
            Позиций
          </th>
          <SortableHeader field="totalAmount" label="Сумма" sort={sort} onSortChange={onSortChange} align="right" />
          <th scope="col" className={thClassName}>
            Статус
          </th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr
            key={order.id}
            data-order-id={order.id}
            onClick={handleRowClick}
            className={clsx(
              'cursor-pointer transition-colors hover:bg-cream-100',
              order.id === activeOrderId && 'bg-brand-50',
            )}
          >
            <td className={clsx(tdClassName, 'font-bold tabular-nums')}>
              <Link to={{ pathname: String(order.id), search }} preventScrollReset className="hover:text-brand-600">
                #{order.id}
              </Link>
            </td>
            <td className={clsx(tdClassName, 'whitespace-nowrap text-espresso-500 tabular-nums')}>
              {formatDateTime(order.createdAt)}
            </td>
            <td className={clsx(tdClassName, 'whitespace-nowrap')}>{order.locationName}</td>
            <td className={clsx(tdClassName, 'max-w-72 truncate')} title={order.itemsSummary}>
              {order.itemsSummary}
            </td>
            <td className={clsx(tdClassName, 'text-right tabular-nums')}>{formatNumber(order.itemsCount)}</td>
            <td className={clsx(tdClassName, 'text-right font-bold whitespace-nowrap tabular-nums')}>
              {formatMoney(order.totalAmount)}
            </td>
            <td className={tdClassName}>
              <OrderStatusBadge status={order.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
