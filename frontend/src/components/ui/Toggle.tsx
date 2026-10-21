import clsx from 'clsx'
import type { ReactNode } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
  title?: string
  className?: string
}

export function Toggle({ checked, onChange, children, disabled, title, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className={clsx(
        'inline-flex h-10 items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 pr-1.5 pl-3.5 text-sm font-semibold',
        'transition-colors hover:border-cream-400 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className={clsx(
          'relative inline-flex h-6 w-10 rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-cream-400',
        )}
      >
        <span
          className={clsx(
            'absolute top-1 size-4 rounded-full bg-cream-50 shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}
