import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useCallback } from 'react'
import type { OrderSort } from '@/api/types'
import { thClassName } from '@/components/ui/tableStyles'

type SortField = 'id' | 'createdAt' | 'totalAmount'

interface SortableHeaderProps {
  field: SortField
  label: string
  sort: OrderSort
  onSortChange: (sort: OrderSort) => void
  align?: 'left' | 'right'
}

export function SortableHeader({ field, label, sort, onSortChange, align = 'left' }: SortableHeaderProps) {
  const direction = sort === field ? 'asc' : sort === `-${field}` ? 'desc' : null
  // First click sorts descending (newest, largest first), the second one flips it.
  const next: OrderSort = direction === 'desc' ? field : `-${field}`
  const handleClick = useCallback(() => onSortChange(next), [onSortChange, next])
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown

  return (
    <th
      scope="col"
      className={clsx(thClassName, align === 'right' && 'text-right')}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
    >
      <button
        type="button"
        onClick={handleClick}
        className={clsx(
          'inline-flex items-center gap-1 uppercase hover:text-espresso-900',
          direction && 'text-espresso-900',
        )}
      >
        {label}
        <Icon aria-hidden className={clsx('size-3.5', !direction && 'opacity-40')} />
      </button>
    </th>
  )
}
