import clsx from 'clsx'
import type { Location } from '@/api/types'
import { isOpenAt } from '@/lib/dates'
import { formatClock } from '@/lib/format'

/** «Открыто · 07:00–22:00» in the Almaty time zone. */
export function OpenStatus({ location }: { location: Pick<Location, 'opensAt' | 'closesAt'> }) {
  const open = isOpenAt(location.opensAt, location.closesAt)
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden className={clsx('size-2 rounded-full', open ? 'bg-success-600' : 'bg-espresso-300')} />
      <span className={open ? 'font-semibold text-success-600' : 'font-semibold text-espresso-400'}>
        {open ? 'Открыто' : 'Закрыто'}
      </span>
      <span className="text-espresso-400 tabular-nums">
        {formatClock(location.opensAt)}–{formatClock(location.closesAt)}
      </span>
    </span>
  )
}
