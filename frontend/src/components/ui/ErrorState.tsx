import clsx from 'clsx'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from './Button'

interface ErrorStateProps {
  error?: unknown
  onRetry?: () => void
  title?: string
  className?: string
}

export function ErrorState({ error, onRetry, title = 'Не удалось загрузить данные', className }: ErrorStateProps) {
  return (
    <div role="alert" className={clsx('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
      <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
        <CircleAlert aria-hidden className="size-5" />
      </span>
      <p className="font-semibold">{title}</p>
      {error !== undefined && <p className="max-w-xs text-sm text-espresso-400">{getErrorMessage(error)}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-3.5" />
          Повторить
        </Button>
      )}
    </div>
  )
}
