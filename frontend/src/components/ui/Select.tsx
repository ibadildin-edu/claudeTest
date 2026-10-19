import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'

interface SelectProps extends ComponentPropsWithRef<'select'> {
  /** Inline caption inside the pill, like «Точка» in the dashboard header. */
  prefix?: string
  invalid?: boolean
}

export function Select({ prefix, invalid, className, children, ...props }: SelectProps) {
  return (
    <label
      className={clsx(
        'relative inline-flex h-10 items-center rounded-xl border bg-cream-50 text-sm transition-colors',
        'focus-within:border-brand-400 hover:border-cream-400',
        invalid ? 'border-danger-600' : 'border-cream-300',
        className,
      )}
    >
      {prefix && <span className="pl-3.5 text-espresso-400">{prefix}</span>}
      <select
        className={clsx(
          'h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-9 font-semibold outline-none',
          prefix ? 'pl-2' : 'pl-3.5',
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-espresso-400" />
    </label>
  )
}
