import { ArrowRight, MapPin } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router'
import type { Location, LocationCompareItem } from '@/api/types'
import { Card } from '@/components/ui/Card'
import { DeltaBadge } from '@/components/ui/DeltaBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { OpenStatus } from './OpenStatus'

interface LocationCardProps {
  location: Location
  /** `undefined` while /analytics/locations-compare is loading. */
  stats: LocationCompareItem | undefined
}

export const LocationCard = memo(function LocationCard({ location, stats }: LocationCardProps) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight">{location.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-espresso-400">
            <MapPin aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{location.address}</span>
          </p>
        </div>
        {stats && <DeltaBadge value={stats.deltaPct} />}
      </div>

      <OpenStatus location={location} />

      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-cream-100 p-4">
        {[
          { label: 'Выручка', value: stats && formatMoneyCompact(stats.revenue) },
          { label: 'Заказы', value: stats && formatNumber(stats.ordersCount) },
          { label: 'Ср. чек', value: stats && formatMoney(stats.avgCheck) },
        ].map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-espresso-400">{label}</dt>
            <dd className="mt-1 truncate font-extrabold tabular-nums">{value ?? <Skeleton className="h-5 w-16" />}</dd>
          </div>
        ))}
      </dl>

      <Link
        to={`/locations/${location.id}`}
        className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-bold text-brand-600 hover:text-brand-700"
      >
        Аналитика точки
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Card>
  )
})
