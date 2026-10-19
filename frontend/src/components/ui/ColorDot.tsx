import clsx from 'clsx'

interface ColorDotProps {
  /** Category color from the API (`categories.color`), so it can't be a Tailwind class. */
  color: string
  className?: string
}

export function ColorDot({ color, className }: ColorDotProps) {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className={clsx('size-2.5 shrink-0', className)}>
      <rect width="10" height="10" rx="3" fill={color} />
    </svg>
  )
}
