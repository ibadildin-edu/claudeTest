import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatDelta } from '@/lib/format'
import { Badge } from './Badge'

interface DeltaBadgeProps {
  /** Change vs the previous period in %; `null` when there is nothing to compare with. */
  value: number | null
}

export function DeltaBadge({ value }: DeltaBadgeProps) {
  if (value === null) return null
  const tone = value > 0 ? 'success' : value < 0 ? 'danger' : 'neutral'
  const Icon = value >= 0 ? ArrowUp : ArrowDown
  return (
    <Badge tone={tone}>
      {value !== 0 && <Icon aria-hidden className="size-3" strokeWidth={3} />}
      {formatDelta(value)}
    </Badge>
  )
}
