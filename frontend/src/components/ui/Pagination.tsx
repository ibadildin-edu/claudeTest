import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { Button } from './Button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav aria-label="Страницы" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-espresso-400">
        {first > total
          ? `На этой странице пусто · всего ${formatNumber(total)}`
          : `${formatNumber(first)}–${formatNumber(last)} из ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.min(page - 1, pageCount))}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <span className="min-w-20 text-center font-semibold tabular-nums">
          {formatNumber(page)} / {formatNumber(pageCount)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Следующая страница"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
