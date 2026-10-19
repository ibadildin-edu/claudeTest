import { Check, Clock, X, type LucideIcon } from 'lucide-react'
import type { OrderStatus } from '@/api/types'
import type { BadgeTone } from '@/components/ui/Badge'

interface StatusView {
  label: string
  tone: BadgeTone
  icon: LucideIcon
}

export const ORDER_STATUS_VIEW: Record<OrderStatus, StatusView> = {
  preparing: { label: 'Готовится', tone: 'brand', icon: Clock },
  completed: { label: 'Выдан', tone: 'neutral', icon: Check },
  cancelled: { label: 'Отменён', tone: 'danger', icon: X },
}

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_VIEW) as OrderStatus[]
