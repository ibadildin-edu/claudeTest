import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

export function Card({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={clsx('rounded-3xl border border-cream-300/70 bg-cream-50 p-5 shadow-card sm:p-7', className)}
      {...props}
    />
  )
}
