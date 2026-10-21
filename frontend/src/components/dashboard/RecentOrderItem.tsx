import clsx from 'clsx'
import { Link } from 'react-router'
import type { OrderListItem } from '@/api/types'
import { ORDER_STATUS_VIEW } from '@/components/orders/orderStatus'
import { formatMoney, formatTime } from '@/lib/format'

const STATUS_TEXT = {
  preparing: 'text-brand-600',
  completed: 'text-espresso-400',
  cancelled: 'text-danger-600',
} as const

export function RecentOrderItem({ order }: { order: OrderListItem }) {
  const { label, icon: Icon } = ORDER_STATUS_VIEW[order.status]
  const preparing = order.status === 'preparing'

  return (
    <Link
      to={`/orders/${order.id}`}
      className={clsx(
        'block rounded-2xl px-4 py-3.5 text-sm transition-colors duration-300',
        preparing ? 'bg-brand-100 hover:bg-brand-200/70' : 'hover:bg-cream-100',
      )}
    >
      <span className="flex items-center justify-between">
        <span className="font-bold tabular-nums">#{order.id}</span>
        <span className="text-espresso-400 tabular-nums">{formatTime(order.createdAt)}</span>
      </span>
      <span className="mt-1 block truncate text-[15px]" title={order.itemsSummary}>
        {order.itemsSummary}
      </span>
      <span className="mt-1 flex items-center justify-between gap-3">
        <span className="truncate text-espresso-400">{order.locationName}</span>
        <span className="font-bold whitespace-nowrap tabular-nums">{formatMoney(order.totalAmount)}</span>
      </span>
      <span className={clsx('mt-1 flex items-center gap-1.5 font-semibold', STATUS_TEXT[order.status])}>
        <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
        {label}
      </span>
    </Link>
  )
}
