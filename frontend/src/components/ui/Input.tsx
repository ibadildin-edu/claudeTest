import clsx from 'clsx'
import type { ComponentPropsWithRef, ReactNode } from 'react'

interface InputProps extends ComponentPropsWithRef<'input'> {
  invalid?: boolean
  /** Icon or text inside the field on the left. */
  leading?: ReactNode
  /** Unit on the right, like ₸. */
  trailing?: ReactNode
}

export function Input({ invalid, leading, trailing, className, ...props }: InputProps) {
  return (
    <div
      className={clsx(
        'flex h-10 items-center gap-2 rounded-xl border bg-cream-50 px-3.5 text-sm transition-colors',
        'focus-within:border-brand-400 hover:border-cream-400',
        invalid ? 'border-danger-600' : 'border-cream-300',
        className,
      )}
    >
      {leading && <span className="flex shrink-0 text-espresso-400">{leading}</span>}
      <input
        className="h-full w-full min-w-0 bg-transparent outline-none placeholder:text-espresso-300"
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing && <span className="shrink-0 text-espresso-400">{trailing}</span>}
    </div>
  )
}
