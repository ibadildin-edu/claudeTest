import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-espresso-900 text-cream-50 hover:bg-espresso-700',
  secondary: 'border border-cream-300 bg-cream-50 text-espresso-900 hover:bg-cream-100',
  ghost: 'text-espresso-600 hover:bg-cream-200 hover:text-espresso-900',
  danger: 'bg-danger-600 text-cream-50 hover:bg-danger-600/90',
  soft: 'bg-cream-200 text-brand-600 hover:bg-cream-300',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
}

/** Shared by <Button> and router <Link>s that look like buttons. */
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
