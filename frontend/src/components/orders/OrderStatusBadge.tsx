import type { OrderStatus } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_VIEW } from './orderStatus'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone, icon: Icon } = ORDER_STATUS_VIEW[status]
  return (
    <Badge tone={tone}>
      <Icon aria-hidden className="size-3" strokeWidth={3} />
      {label}
    </Badge>
  )
}
