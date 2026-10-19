import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

/** Horizontal scroll on narrow screens; cell styles are in tableStyles.ts. */
export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-7 sm:px-7">
      <table className={clsx('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}
