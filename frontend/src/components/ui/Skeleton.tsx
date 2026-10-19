import clsx from 'clsx'
import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <span aria-hidden className={clsx('block animate-pulse rounded-lg bg-cream-200', className)} style={style} />
}
