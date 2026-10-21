import clsx from 'clsx'
import type { OrderListItem } from '@/api/types'
import { useFeedTransitions } from '@/lib/useFeedTransitions'
import { RecentOrderItem } from './RecentOrderItem'

const getOrderId = (order: OrderListItem) => order.id

/**
 * New orders slide in at the top while the oldest ones fold away at the bottom.
 * Height is animated with `grid-template-rows: 0fr → 1fr` on the item.
 */
export function RecentOrdersList({ orders }: { orders: OrderListItem[] }) {
  const entries = useFeedTransitions(orders, getOrderId)

  return (
    <ul>
      {entries.map(({ key, item, phase }) => (
        <li
          key={key}
          inert={phase === 'exit'}
          className={clsx(
            'grid grid-cols-1 motion-reduce:animate-none',
            phase === 'enter' && 'animate-feed-enter',
            phase === 'exit' && 'animate-feed-exit',
          )}
        >
          {/* Clip only while animating: the focus ring of the link sticks out of the box. */}
          <div className={clsx('min-h-0 pb-1', phase !== 'idle' && 'overflow-hidden')}>
            <RecentOrderItem order={item} />
          </div>
        </li>
      ))}
    </ul>
  )
}
