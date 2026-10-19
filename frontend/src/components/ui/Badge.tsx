import clsx from 'clsx'
import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-cream-200 text-espresso-600',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-success-100 text-success-600',
  danger: 'bg-danger-100 text-danger-600',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
