import clsx from 'clsx'
import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
      <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-cream-200 text-espresso-400">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-xs text-sm text-espresso-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
